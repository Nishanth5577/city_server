// Virtual Tour Controller — tour data stored in DesignHistory with action='tour'
const prisma = require('../../config/prisma');
const crypto = require('crypto');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.createTour = async (req, res, next) => {
  try {
    const { bim_project_id, name, description, waypoints, settings } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const entry = await prisma.designHistory.create({
      data: {
        bim_project_id, action: 'tour_created',
        description: name || 'Virtual Tour',
        user_id: req.user.userId, user_name: req.user.name || 'User',
        snapshot: { name, description, waypoints: waypoints || [], settings: settings || {}, token, published: false },
      },
    });
    res.status(201).json({ ...addId(entry), token });
  } catch (err) { next(err); }
};

exports.getTours = async (req, res, next) => {
  try {
    const bim_project_id = req.params.projectId || req.query.bim_project_id;
    if (!bim_project_id) return res.json([]);
    const tours = await prisma.designHistory.findMany({
      where: { bim_project_id, action: 'tour_created' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tours.map(t => ({ ...addId(t), name: t.snapshot?.name || t.description, waypoints: t.snapshot?.waypoints || [], published: t.snapshot?.published || false, token: t.snapshot?.token })));
  } catch (err) { next(err); }
};

exports.getTour = async (req, res, next) => {
  try {
    const tour = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    res.json({ ...addId(tour), name: tour.snapshot?.name || tour.description, waypoints: tour.snapshot?.waypoints || [] });
  } catch (err) { next(err); }
};

exports.updateTour = async (req, res, next) => {
  try {
    const existing = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Tour not found' });
    const snapshot = { ...(existing.snapshot || {}), ...req.body };
    const tour = await prisma.designHistory.update({ where: { id: req.params.id }, data: { snapshot, description: req.body.name || existing.description } });
    res.json(addId(tour));
  } catch (err) { next(err); }
};

exports.deleteTour = async (req, res, next) => {
  try {
    await prisma.designHistory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tour deleted' });
  } catch (err) { next(err); }
};

exports.addWaypoint = async (req, res, next) => {
  try {
    const tour = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    const snapshot = tour.snapshot || {};
    const waypoints = snapshot.waypoints || [];
    waypoints.push({ id: `wp_${Date.now()}`, ...req.body, createdAt: new Date() });
    await prisma.designHistory.update({ where: { id: req.params.id }, data: { snapshot: { ...snapshot, waypoints } } });
    res.json({ waypoints });
  } catch (err) { next(err); }
};

exports.updateWaypoint = async (req, res, next) => {
  try {
    const tour = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    const snapshot = tour.snapshot || {};
    const waypoints = (snapshot.waypoints || []).map(wp => wp.id === req.params.waypointId ? { ...wp, ...req.body } : wp);
    await prisma.designHistory.update({ where: { id: req.params.id }, data: { snapshot: { ...snapshot, waypoints } } });
    res.json({ waypoints });
  } catch (err) { next(err); }
};

exports.removeWaypoint = async (req, res, next) => {
  try {
    const tour = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    const snapshot = tour.snapshot || {};
    const waypoints = (snapshot.waypoints || []).filter(wp => wp.id !== req.params.waypointId);
    await prisma.designHistory.update({ where: { id: req.params.id }, data: { snapshot: { ...snapshot, waypoints } } });
    res.json({ waypoints });
  } catch (err) { next(err); }
};

exports.addHotspot = async (req, res, next) => {
  try {
    const tour = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    const snapshot = tour.snapshot || {};
    const hotspots = snapshot.hotspots || [];
    hotspots.push({ id: `hs_${Date.now()}`, ...req.body, createdAt: new Date() });
    await prisma.designHistory.update({ where: { id: req.params.id }, data: { snapshot: { ...snapshot, hotspots } } });
    res.json({ hotspots });
  } catch (err) { next(err); }
};

exports.togglePublish = async (req, res, next) => {
  try {
    const tour = await prisma.designHistory.findUnique({ where: { id: req.params.id } });
    if (!tour) return res.status(404).json({ message: 'Tour not found' });
    const snapshot = tour.snapshot || {};
    snapshot.published = !snapshot.published;
    await prisma.designHistory.update({ where: { id: req.params.id }, data: { snapshot } });
    res.json({ published: snapshot.published, token: snapshot.token });
  } catch (err) { next(err); }
};
