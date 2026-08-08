const Material = require('../models/Material');

// @desc    Get materials
// @route   GET /api/materials
exports.getMaterials = async (req, res, next) => {
  try {
    const { project_id, category, search, low_stock, page = 1, limit = 50 } = req.query;
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    if (project_id) query.project_id = project_id;
    if (category) query.category = category;
    if (search) query.material_name = { $regex: search, $options: 'i' };
    if (low_stock === 'true') {
      query.$expr = { $lte: ['$available_stock', '$low_stock_threshold'] };
    }

    const materials = await Material.find(query)
      .populate('project_id', 'project_name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Material.countDocuments(query);
    res.json({ materials, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create material
// @route   POST /api/materials
exports.createMaterial = async (req, res, next) => {
  try {
    const material = await Material.create({
      ...req.body,
      company_id: req.user.company_id,
      available_stock: req.body.quantity || 0,
    });
    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
};

// @desc    Update material
// @route   PUT /api/materials/:id
exports.updateMaterial = async (req, res, next) => {
  try {
    const material = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    res.json(material);
  } catch (error) {
    next(error);
  }
};

// @desc    Use stock
// @route   PATCH /api/materials/:id/use
exports.useStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    if (material.available_stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock.' });
    }
    material.available_stock -= quantity;
    material.used_stock += quantity;
    await material.save();
    res.json(material);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete material
// @route   DELETE /api/materials/:id
exports.deleteMaterial = async (req, res, next) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    res.json({ message: 'Material deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock alerts
// @route   GET /api/materials/alerts/low-stock
exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;

    const alerts = await Material.find({
      ...query,
      $expr: { $lte: ['$available_stock', '$low_stock_threshold'] },
    }).populate('project_id', 'project_name');

    res.json(alerts);
  } catch (error) {
    next(error);
  }
};
