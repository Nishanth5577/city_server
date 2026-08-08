const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getWeather } = require('../controllers/weatherController');

router.get('/', auth, getWeather);

module.exports = router;
