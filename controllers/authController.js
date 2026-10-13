const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { sendResetPasswordEmail } = require('../services/emailService');

// Helper: hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Helper: strip sensitive fields
const sanitizeUser = (user) => {
  const { password, refreshToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
  return safe;
};

// @desc    Register new user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, company_name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPw = await hashPassword(password);

    // If registering as admin, create company
    if (role === 'admin' && company_name) {
      const user = await prisma.user.create({
        data: { name, email, password: hashedPw, role, phone },
      });
      const company = await prisma.company.create({
        data: { company_name, owner_id: user.id },
      });

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { company_id: company.id, refreshToken },
      });

      return res.status(201).json({
        user: sanitizeUser(updated),
        accessToken,
        refreshToken,
      });
    }

    // For non-admin, accept company_id from body or auto-assign first company
    let assignedCompanyId = req.body.company_id || null;
    if (!assignedCompanyId) {
      const defaultCompany = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
      if (defaultCompany) assignedCompanyId = defaultCompany.id;
    }

    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPw,
        role: role || 'worker', phone,
        company_id: assignedCompanyId,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.status(201).json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { refreshToken: null },
    });
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { company: true },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    // Map company to company_id field for frontend compat
    const result = sanitizeUser(user);
    if (user.company) {
      result.company_id = user.company;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (req.file) updates.profile_image = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: updates,
    });
    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendResetPasswordEmail(email, resetToken);

    res.json({
      message: 'If the email exists, a reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const hashedPw = await hashPassword(req.body.password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPw,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        refreshToken: null,
      },
    });

    res.json({ message: 'Password reset successful. Please sign in.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password (authenticated)
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password.' });
    }

    const hashedPw = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPw, refreshToken: null },
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (req.user.company_id) where.company_id = req.user.company_id;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, role: true, phone: true,
          profile_image: true, company_id: true, isActive: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Map id → _id for frontend compat
    const mapped = users.map(u => ({ ...u, _id: u.id }));

    res.json({
      users: mapped,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role / company assignment (admin only)
// @route   PUT /api/auth/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { role, isActive, company_id } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (company_id) updates.company_id = company_id;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updates,
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(sanitizeUser(user));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};
