const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { upload } = require('../middleware/upload');
const { getDocuments, uploadDocument, deleteDocument, downloadDocument } = require('../controllers/documentController');

router.get('/', auth, getDocuments);
router.post('/', auth, upload.single('file'), uploadDocument);
router.get('/:id/download', auth, downloadDocument);
router.delete('/:id', auth, authorize('admin', 'project_manager'), deleteDocument);

module.exports = router;
