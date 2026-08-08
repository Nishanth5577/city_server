const Company = require('../models/Company');
const User = require('../models/User');

// @desc    Get company details
// @route   GET /api/companies/mine
exports.getMyCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.company_id).populate('owner', 'name email');
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }
    res.json(company);
  } catch (error) {
    next(error);
  }
};

// @desc    Update company
// @route   PUT /api/companies/mine
exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.user.company_id, owner: req.user.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!company) {
      return res.status(404).json({ message: 'Company not found or unauthorized.' });
    }
    res.json(company);
  } catch (error) {
    next(error);
  }
};

// @desc    Get company members
// @route   GET /api/companies/members
exports.getCompanyMembers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = { company_id: req.user.company_id };

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const members = await User.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({ members, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to company
// @route   POST /api/companies/members
exports.addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { company_id: req.user.company_id },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};
