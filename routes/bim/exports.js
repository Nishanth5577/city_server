const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/exportController');

router.use(auth);
router.get('/:projectId', ctrl.exportProject);
router.get('/floor/:floorId', ctrl.exportFloor);
router.get('/:projectId/history', ctrl.getDesignHistory);
router.post('/:projectId/history', ctrl.addDesignHistory);

module.exports = router;
