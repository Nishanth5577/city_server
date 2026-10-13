const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getActivities, createActivity } = require('../controllers/activityController');

router.get('/', auth, getActivities);
router.post('/', auth, createActivity);

module.exports = router;
