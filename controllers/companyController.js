const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getCompany = async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id }, include: { owner: { select: { id: true, name: true, email: true } } } });
    if (!company) return res.status(404).json({ message: 'Company not found.' });
    res.json({ ...company, _id: company.id, owner: company.owner ? { ...company.owner, _id: company.owner.id } : null });
  } catch (error) { next(error); }
};

exports.getMyCompany = async (req, res, next) => {
  try {
    if (!req.user.company_id) return res.status(404).json({ message: 'No company assigned.' });
    const company = await prisma.company.findUnique({ where: { id: req.user.company_id }, include: { owner: { select: { id: true, name: true, email: true } } } });
    if (!company) return res.status(404).json({ message: 'Company not found.' });
    res.json({ ...company, _id: company.id, owner: company.owner ? { ...company.owner, _id: company.owner.id } : null });
  } catch (error) { next(error); }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const { _id, address, contact, registration_details, ...data } = req.body;
    // Flatten nested objects
    if (address) {
      data.address_street = address.street || '';
      data.address_city = address.city || '';
      data.address_state = address.state || '';
      data.address_zip = address.zip || '';
      data.address_country = address.country || '';
    }
    if (contact) {
      data.contact_phone = contact.phone || '';
      data.contact_email = contact.email || '';
      data.contact_website = contact.website || '';
    }
    if (registration_details) {
      data.registration_number = registration_details.registration_number || '';
      data.gst_number = registration_details.gst_number || '';
      data.pan_number = registration_details.pan_number || '';
    }
    if (req.file) data.logo = `/uploads/${req.file.filename}`;
    const companyId = req.params.id || req.user.company_id;
    const company = await prisma.company.update({ where: { id: companyId }, data });
    res.json(addId(company));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Company not found.' });
    next(error);
  }
};

exports.getCompanyMembers = async (req, res, next) => {
  try {
    if (!req.user.company_id) return res.status(400).json({ message: 'No company assigned.' });
    const members = await prisma.user.findMany({
      where: { company_id: req.user.company_id },
      select: { id: true, name: true, email: true, role: true, phone: true, profile_image: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(members.map(m => ({ ...m, _id: m.id })));
  } catch (error) { next(error); }
};

exports.addMember = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { name, email, password, role, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password || 'changeme123', 12);
    const member = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'worker', phone, company_id: req.user.company_id },
    });
    res.status(201).json({ ...member, _id: member.id, password: undefined });
  } catch (error) { next(error); }
};
