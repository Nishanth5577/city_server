const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/importController');

router.use(auth);

// CAD (DWG/DXF)
router.post('/cad', ctrl.upload.single('file'), ctrl.uploadCAD);
router.get('/cad/:projectId', ctrl.getCADImports);
router.delete('/cad/:id', ctrl.deleteCADImport);

// PDF Floor Plan
router.post('/pdf', ctrl.upload.single('file'), ctrl.uploadPDF);
router.get('/pdf/:projectId', ctrl.getPDFImports);
router.put('/pdf/:id/trace', ctrl.saveTracedGeometry);
router.delete('/pdf/:id', ctrl.deletePDFImport);

// IFC
router.post('/ifc', ctrl.upload.single('file'), ctrl.uploadIFC);
router.get('/ifc/:projectId', ctrl.getIFCImports);
router.delete('/ifc/:id', ctrl.deleteIFCImport);

// Summary
router.get('/summary/:projectId', ctrl.getImportSummary);

module.exports = router;
