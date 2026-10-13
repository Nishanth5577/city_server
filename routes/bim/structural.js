const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/structuralController');

router.use(auth);
router.get('/', ctrl.getDesigns);
router.post('/', ctrl.createDesign);
router.post('/analyze', ctrl.analyzeStructure);
router.get('/:id', ctrl.getDesign);
router.put('/:id', ctrl.updateDesign);
router.delete('/:id', ctrl.deleteDesign);

module.exports = router;
