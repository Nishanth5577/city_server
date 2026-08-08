const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/bimAnalyticsController');

router.use(auth);
router.get('/', ctrl.getAnalytics);

module.exports = router;
