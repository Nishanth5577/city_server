const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/mepController');

router.use(auth);

// CRUD for MEP elements
router.post('/:type', ctrl.createMEPElement);
router.get('/:type/floor/:floorId', ctrl.getMEPElements);
router.put('/:type/:id', ctrl.updateMEPElement);
router.delete('/:type/:id', ctrl.deleteMEPElement);

// Analysis endpoints
router.get('/analysis/electrical/:floorId', ctrl.electricalLoadAnalysis);
router.get('/analysis/plumbing/:floorId', ctrl.plumbingPipeSchedule);
router.get('/analysis/hvac/:floorId', ctrl.hvacCoolingLoad);
router.get('/analysis/solar/:projectId', ctrl.solarEstimate);

module.exports = router;
