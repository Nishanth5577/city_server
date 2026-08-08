const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { predictDelay, recommendResources, predictCost } = require('../controllers/aiController');

router.get('/delay-prediction/:projectId', auth, predictDelay);
router.get('/resource-recommendation/:projectId', auth, recommendResources);
router.get('/cost-prediction/:projectId', auth, predictCost);

module.exports = router;
