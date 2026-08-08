const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');

exports.getDocuments = async (req, res, next) => {
  try {
    const { project_id, type, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    if (project_id) query.project_id = project_id;
    if (type) query.type = type;
    if (search) query.name = { $regex: search, $options: 'i' };

    // Role-based access filter
    if (req.user.role !== 'admin') {
      query.$or = [
        { access_roles: { $size: 0 } },
        { access_roles: req.user.role },
        { uploaded_by: req.user.userId },
      ];
    }

    const documents = await Document.find(query)
      .populate('project_id', 'project_name')
      .populate('uploaded_by', 'name')
      .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
    const total = await Document.countDocuments(query);
    res.json({ documents, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const doc = await Document.create({
      name: req.body.name || req.file.originalname,
      type: req.body.type || 'other',
      file_url: `/uploads/${req.file.filename}`,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      project_id: req.body.project_id,
      uploaded_by: req.user.userId,
      access_roles: req.body.access_roles ? JSON.parse(req.body.access_roles) : [],
      description: req.body.description || '',
      company_id: req.user.company_id,
    });

    const populated = await Document.findById(doc._id)
      .populate('project_id', 'project_name').populate('uploaded_by', 'name');
    res.status(201).json(populated);
  } catch (error) { next(error); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    // Delete file from disk
    const filePath = path.join(__dirname, '..', doc.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Document deleted.' });
  } catch (error) { next(error); }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const filePath = path.join(__dirname, '..', doc.file_url);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk.' });

    res.download(filePath, doc.name);
  } catch (error) { next(error); }
};
