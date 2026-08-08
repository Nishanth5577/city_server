const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { getDPRs, getDPR, createDPR, updateDPR, deleteDPR } = require('../controllers/dprController');

router.get('/', auth, getDPRs);
router.get('/:id', auth, getDPR);
router.post('/', auth, uploadImage.array('images', 10), createDPR);
router.put('/:id', auth, updateDPR);
router.delete('/:id', auth, deleteDPR);

module.exports = router;
