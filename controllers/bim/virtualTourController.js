const { BIMVirtualTour } = require('../../models/bim/BIMMetadata');
const crypto = require('crypto');

// @desc    Create virtual tour
// @route   POST /api/bim/virtual-tour
exports.createTour = async (req, res) => {
  try {
    const { company_id, userId } = req.user;
    const tour = await BIMVirtualTour.create({
      ...req.body,
      company_id,
      created_by: userId,
      share_token: crypto.randomBytes(16).toString('hex'),
    });
    res.status(201).json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get tours for project
// @route   GET /api/bim/virtual-tour/:projectId
exports.getTours = async (req, res) => {
  try {
    const tours = await BIMVirtualTour.find({ bim_project_id: req.params.projectId })
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });
    res.json(tours);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get single tour (by ID or share token)
// @route   GET /api/bim/virtual-tour/view/:idOrToken
exports.getTour = async (req, res) => {
  try {
    const { idOrToken } = req.params;
    let tour = await BIMVirtualTour.findById(idOrToken).catch(() => null);
    if (!tour) tour = await BIMVirtualTour.findOne({ share_token: idOrToken });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update tour
// @route   PUT /api/bim/virtual-tour/:id
exports.updateTour = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete tour
// @route   DELETE /api/bim/virtual-tour/:id
exports.deleteTour = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findByIdAndDelete(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    res.json({ message: 'Tour deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add waypoint to tour
// @route   POST /api/bim/virtual-tour/:id/waypoints
exports.addWaypoint = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    tour.waypoints.push(req.body);
    await tour.save();
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update waypoint
// @route   PUT /api/bim/virtual-tour/:id/waypoints/:waypointIndex
exports.updateWaypoint = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    const idx = parseInt(req.params.waypointIndex);
    if (idx < 0 || idx >= tour.waypoints.length) return res.status(400).json({ message: 'Invalid waypoint index' });
    Object.assign(tour.waypoints[idx], req.body);
    await tour.save();
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Remove waypoint
// @route   DELETE /api/bim/virtual-tour/:id/waypoints/:waypointIndex
exports.removeWaypoint = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    tour.waypoints.splice(parseInt(req.params.waypointIndex), 1);
    await tour.save();
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Add hotspot to tour
// @route   POST /api/bim/virtual-tour/:id/hotspots
exports.addHotspot = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    tour.hotspots.push(req.body);
    await tour.save();
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Publish / unpublish tour
// @route   PUT /api/bim/virtual-tour/:id/publish
exports.togglePublish = async (req, res) => {
  try {
    const tour = await BIMVirtualTour.findById(req.params.id);
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    tour.status = tour.status === 'published' ? 'draft' : 'published';
    await tour.save();
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
