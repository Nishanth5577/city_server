const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/costEstimationController');

router.use(auth);
router.get('/', ctrl.getEstimations);
router.get('/:id', ctrl.getEstimation);
router.post('/', ctrl.createEstimation);
router.post('/generate', ctrl.generateBOQ);
router.put('/:id', ctrl.updateEstimation);
router.delete('/:id', ctrl.deleteEstimation);

module.exports = router;
