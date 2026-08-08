const router = require('express').Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/bim/virtualTourController');

router.use(auth);

router.post('/', ctrl.createTour);
router.get('/:projectId', ctrl.getTours);
router.get('/view/:idOrToken', ctrl.getTour);
router.put('/:id', ctrl.updateTour);
router.delete('/:id', ctrl.deleteTour);
router.post('/:id/waypoints', ctrl.addWaypoint);
router.put('/:id/waypoints/:waypointIndex', ctrl.updateWaypoint);
router.delete('/:id/waypoints/:waypointIndex', ctrl.removeWaypoint);
router.post('/:id/hotspots', ctrl.addHotspot);
router.put('/:id/publish', ctrl.togglePublish);

module.exports = router;
