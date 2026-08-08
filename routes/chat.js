const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { sendMessage, getConversation, getConversations, getUsers } = require('../controllers/chatController');

router.get('/users', auth, getUsers);
router.get('/conversations', auth, getConversations);
router.get('/conversation/:userId', auth, getConversation);
router.post('/message', auth, upload.single('attachment'), sendMessage);

module.exports = router;
