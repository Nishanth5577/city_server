const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getOwnerDashboard, getManagerDashboard, getEngineerDashboard, getWorkerDashboard } = require('../controllers/dashboardController');

router.get('/owner', auth, getOwnerDashboard);
router.get('/manager', auth, getManagerDashboard);
router.get('/engineer', auth, getEngineerDashboard);
router.get('/worker', auth, getWorkerDashboard);

module.exports = router;
