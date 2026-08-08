const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/structuralController');

router.use(auth);
router.post('/generate', ctrl.generateStructural);
router.get('/:projectId', ctrl.getStructural);
router.put('/:id', ctrl.updateStructural);
router.get('/schedule/:projectId/columns', ctrl.getColumnSchedule);
router.get('/schedule/:projectId/beams', ctrl.getBeamSchedule);

module.exports = router;
