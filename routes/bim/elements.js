const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/elementController');

router.use(auth);
router.get('/', ctrl.getElements);
router.get('/:type/:id', ctrl.getElement);
router.post('/', ctrl.createElement);
router.post('/batch', ctrl.batchCreate);
router.put('/batch', ctrl.batchUpdate);
router.put('/:type/:id', ctrl.updateElement);
router.delete('/:type/:id', ctrl.deleteElement);

module.exports = router;
