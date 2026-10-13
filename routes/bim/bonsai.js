const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/bonsaiController');

router.use(auth);

// Service status
router.get('/status', ctrl.getStatus);

// Schema info
router.get('/schema', ctrl.getSchemaInfo);

// Export project to IFC
router.post('/export/:projectId', ctrl.exportToIFC);

// Import IFC file
router.post('/import', ctrl.upload.single('file'), ctrl.importIFC);

// Parse IFC file (structural analysis only)
router.post('/parse', ctrl.upload.single('file'), ctrl.parseIFC);

// Validate an existing IFC export
router.post('/validate/:exportId', ctrl.validateIFC);

// Download IFC file
router.get('/download/:filename', ctrl.downloadIFC);

// Export history
router.get('/exports/:projectId', ctrl.getExportHistory);
router.delete('/exports/:id', ctrl.deleteExport);

module.exports = router;
