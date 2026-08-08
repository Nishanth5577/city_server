const BIMBuildingMaterial = require('../../models/bim/BuildingMaterial');

// @desc    Get all materials (with search/filter)
// @route   GET /api/bim/materials
exports.getMaterials = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { category, search, is_default } = req.query;

    const filter = { $or: [{ company_id }, { is_default: true }] };
    if (category) filter.category = category;
    if (is_default === 'true') filter.is_default = true;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const materials = await BIMBuildingMaterial.find(filter).sort({ category: 1, name: 1 });
    res.json(materials);
  } catch (err) { next(err); }
};

// @desc    Get single material
// @route   GET /api/bim/materials/:id
exports.getMaterial = async (req, res, next) => {
  try {
    const material = await BIMBuildingMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json(material);
  } catch (err) { next(err); }
};

// @desc    Create material
// @route   POST /api/bim/materials
exports.createMaterial = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const material = await BIMBuildingMaterial.create({ ...req.body, company_id });
    res.status(201).json(material);
  } catch (err) { next(err); }
};

// @desc    Update material
// @route   PUT /api/bim/materials/:id
exports.updateMaterial = async (req, res, next) => {
  try {
    const material = await BIMBuildingMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json(material);
  } catch (err) { next(err); }
};

// @desc    Delete material
// @route   DELETE /api/bim/materials/:id
exports.deleteMaterial = async (req, res, next) => {
  try {
    const material = await BIMBuildingMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    if (material.is_default) return res.status(400).json({ message: 'Cannot delete default material' });
    await material.deleteOne();
    res.json({ message: 'Material deleted' });
  } catch (err) { next(err); }
};

// @desc    Seed default materials
// @route   POST /api/bim/materials/seed
exports.seedDefaults = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const existing = await BIMBuildingMaterial.countDocuments({ company_id, is_default: true });
    if (existing > 0) return res.json({ message: 'Defaults already seeded', count: existing });

    const defaults = [
      { name: 'M20 Concrete', category: 'concrete', unit: 'cum', cost_per_unit: 5500, density: 2400, compressive_strength: 20, color: '#B0B0B0', roughness: 0.8, metalness: 0 },
      { name: 'M25 Concrete', category: 'concrete', unit: 'cum', cost_per_unit: 6000, density: 2400, compressive_strength: 25, color: '#A8A8A8', roughness: 0.8, metalness: 0 },
      { name: 'M30 Concrete', category: 'concrete', unit: 'cum', cost_per_unit: 6800, density: 2400, compressive_strength: 30, color: '#A0A0A0', roughness: 0.8, metalness: 0 },
      { name: 'Fe500 TMT Steel', category: 'steel', unit: 'kg', cost_per_unit: 65, density: 7850, tensile_strength: 500, color: '#696969', roughness: 0.4, metalness: 0.8 },
      { name: 'Fe500D TMT Steel', category: 'steel', unit: 'kg', cost_per_unit: 70, density: 7850, tensile_strength: 500, color: '#606060', roughness: 0.4, metalness: 0.8 },
      { name: 'Red Clay Brick', category: 'brick', unit: 'nos', cost_per_unit: 8, density: 1900, compressive_strength: 10, color: '#B22222', roughness: 0.9, metalness: 0 },
      { name: 'AAC Block 600x200x150', category: 'brick', unit: 'nos', cost_per_unit: 45, density: 550, compressive_strength: 4, color: '#E8E8E8', roughness: 0.7, metalness: 0 },
      { name: 'Fly Ash Brick', category: 'brick', unit: 'nos', cost_per_unit: 7, density: 1700, compressive_strength: 7.5, color: '#A0A0A0', roughness: 0.85, metalness: 0 },
      { name: 'Granite - Polished Black', category: 'granite', unit: 'sqft', cost_per_unit: 120, density: 2700, color: '#1C1C1C', roughness: 0.1, metalness: 0.05 },
      { name: 'Granite - Polished White', category: 'granite', unit: 'sqft', cost_per_unit: 150, density: 2700, color: '#F5F5F5', roughness: 0.1, metalness: 0.05 },
      { name: 'Italian Marble', category: 'marble', unit: 'sqft', cost_per_unit: 350, density: 2600, color: '#FAFAFA', roughness: 0.05, metalness: 0.02 },
      { name: 'Vitrified Tile 600x600', category: 'tile', unit: 'sqft', cost_per_unit: 45, density: 2200, color: '#E0D5C0', roughness: 0.2, metalness: 0.05 },
      { name: 'Ceramic Wall Tile 300x450', category: 'tile', unit: 'sqft', cost_per_unit: 30, density: 2000, color: '#FFFFFF', roughness: 0.3, metalness: 0 },
      { name: 'Teak Wood', category: 'wood', unit: 'cft', cost_per_unit: 3500, density: 650, color: '#8B4513', roughness: 0.6, metalness: 0 },
      { name: 'Plywood 18mm BWR', category: 'wood', unit: 'sqft', cost_per_unit: 85, density: 550, color: '#D2B48C', roughness: 0.65, metalness: 0 },
      { name: 'Float Glass 6mm', category: 'glass', unit: 'sqft', cost_per_unit: 55, density: 2500, color: '#B0E0E6', roughness: 0, metalness: 0.1, opacity: 0.3 },
      { name: 'Tempered Glass 12mm', category: 'glass', unit: 'sqft', cost_per_unit: 180, density: 2500, color: '#B0E0E6', roughness: 0, metalness: 0.1, opacity: 0.2 },
      { name: 'Emulsion Paint - Interior', category: 'paint', unit: 'sqft', cost_per_unit: 12, color: '#FFFFFF', roughness: 0.4, metalness: 0 },
      { name: 'Exterior Texture Paint', category: 'paint', unit: 'sqft', cost_per_unit: 25, color: '#F5DEB3', roughness: 0.7, metalness: 0 },
      { name: 'UPVC Pipe 4 inch', category: 'pvc', unit: 'rft', cost_per_unit: 75, color: '#808080', roughness: 0.3, metalness: 0 },
      { name: 'Aluminium Section', category: 'aluminium', unit: 'kg', cost_per_unit: 280, density: 2700, color: '#C0C0C0', roughness: 0.2, metalness: 0.9 },
      { name: 'OPC Cement 53 Grade', category: 'cement', unit: 'bag', cost_per_unit: 380, density: 1440, color: '#A9A9A9', roughness: 0.9, metalness: 0 },
      { name: 'River Sand - Fine', category: 'sand', unit: 'cum', cost_per_unit: 2200, density: 1600, color: '#F4A460', roughness: 0.95, metalness: 0 },
      { name: '20mm Aggregate', category: 'aggregate', unit: 'cum', cost_per_unit: 1800, density: 1500, color: '#808080', roughness: 0.95, metalness: 0 },
      { name: 'Cement Plaster', category: 'plaster', unit: 'sqft', cost_per_unit: 18, color: '#D3D3D3', roughness: 0.75, metalness: 0 },
      { name: 'APP Membrane Waterproofing', category: 'waterproofing', unit: 'sqm', cost_per_unit: 350, color: '#2F4F4F', roughness: 0.5, metalness: 0 },
      { name: 'XPS Insulation 50mm', category: 'insulation', unit: 'sqm', cost_per_unit: 400, thermal_conductivity: 0.034, color: '#FFB6C1', roughness: 0.6, metalness: 0 },
    ];

    const materials = await BIMBuildingMaterial.insertMany(
      defaults.map(m => ({ ...m, company_id, is_default: true, is_active: true }))
    );

    res.status(201).json({ message: 'Default materials seeded', count: materials.length });
  } catch (err) { next(err); }
};
