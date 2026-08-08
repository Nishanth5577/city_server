const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/aiArchitectController');

router.use(auth);

router.post('/generate-plan', ctrl.generateFloorPlan);
router.post('/generate-and-save', ctrl.generateAndSave);
router.get('/suggestions/:projectId', ctrl.getDesignSuggestions);
router.get('/vastu/:projectId', ctrl.vastuAnalysis);

module.exports = router;
