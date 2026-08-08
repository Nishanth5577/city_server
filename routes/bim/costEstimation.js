const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/costEstimationController');

router.use(auth);
router.get('/', ctrl.getCostEstimations);
router.get('/:id', ctrl.getCostEstimation);
router.post('/generate', ctrl.generateBOQ);
router.put('/:id', ctrl.updateCostEstimation);
router.delete('/:id', ctrl.deleteCostEstimation);

module.exports = router;
