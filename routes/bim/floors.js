const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/floorController');

router.use(auth);
router.get('/', ctrl.getFloors);
router.get('/:id', ctrl.getFloor);
router.put('/:id', ctrl.updateFloor);
router.put('/:id/canvas', ctrl.saveCanvas);
router.post('/:id/duplicate', ctrl.duplicateFloor);

module.exports = router;
