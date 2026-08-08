const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCalendarEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/calendarController');

router.get('/', auth, getCalendarEvents);
router.post('/', auth, createEvent);
router.put('/:id', auth, updateEvent);
router.delete('/:id', auth, deleteEvent);

module.exports = router;
