const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/bimProjectController');

router.use(auth);
router.get('/', ctrl.getProjects);
router.get('/:id', ctrl.getProject);
router.post('/', ctrl.createProject);
router.put('/:id', ctrl.updateProject);
router.delete('/:id', ctrl.deleteProject);
router.post('/:id/collaborators', ctrl.addCollaborator);

module.exports = router;
