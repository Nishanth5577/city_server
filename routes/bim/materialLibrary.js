const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/materialLibraryController');

router.use(auth);
router.get('/', ctrl.getMaterials);
router.get('/:id', ctrl.getMaterial);
router.post('/', ctrl.createMaterial);
router.post('/seed', ctrl.seedDefaults);
router.put('/:id', ctrl.updateMaterial);
router.delete('/:id', ctrl.deleteMaterial);

module.exports = router;
