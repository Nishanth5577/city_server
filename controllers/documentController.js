const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getDocuments = async (req, res, next) => {
  try {
    const { project_id, type, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (project_id) where.project_id = project_id;
    if (type) where.type = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [documents, total] = await Promise.all([
      prisma.document.findMany({ where, skip, take, include: { uploader: { select: { id: true, name: true } }, project: { select: { id: true, project_name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.document.count({ where }),
    ]);
    res.json({ documents: documents.map(d => ({ ...d, _id: d.id, uploaded_by: d.uploader ? { ...d.uploader, _id: d.uploader.id } : d.uploaded_by })), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const data = { ...req.body, uploaded_by: req.user.userId, company_id: req.user.company_id };
    if (req.file) { data.file_url = `/uploads/${req.file.filename}`; data.file_size = req.file.size; data.mime_type = req.file.mimetype; }
    delete data._id;
    const doc = await prisma.document.create({ data });
    res.status(201).json(addId(doc));
  } catch (error) { next(error); }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: 'Document deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Document not found.' });
    next(error);
  }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });
    if (!doc.file_url) return res.status(404).json({ message: 'File not available.' });
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', doc.file_url);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, doc.name || path.basename(filePath));
    }
    res.status(404).json({ message: 'File not found on server.' });
  } catch (error) { next(error); }
};
