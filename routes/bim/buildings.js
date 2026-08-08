const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/buildingController');

router.use(auth);
router.get('/', ctrl.getBuildings);
router.get('/:id', ctrl.getBuilding);
router.post('/', ctrl.createBuilding);
router.put('/:id', ctrl.updateBuilding);
router.delete('/:id', ctrl.deleteBuilding);

module.exports = router;
