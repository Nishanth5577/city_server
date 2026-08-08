const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

const { getMyCompany, updateCompany, getCompanyMembers, addMember } = require('../controllers/companyController');

router.get('/mine', auth, getMyCompany);
router.put('/mine', auth, authorize('admin'), updateCompany);
router.get('/members', auth, authorize('admin', 'project_manager'), getCompanyMembers);
router.post('/members', auth, authorize('admin'), addMember);

module.exports = router;
