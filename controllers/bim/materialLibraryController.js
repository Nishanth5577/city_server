const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getMaterials = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [materials, total] = await Promise.all([
      prisma.buildingMaterial.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.buildingMaterial.count({ where }),
    ]);
    // Return plain array — BIM Redux thunk stores payload directly as state.materials
    res.json(materials.map(addId));
  } catch (err) { next(err); }
};

exports.getMaterial = async (req, res, next) => {
  try {
    const material = await prisma.buildingMaterial.findUnique({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ message: 'Material not found' });
    res.json(addId(material));
  } catch (err) { next(err); }
};

exports.createMaterial = async (req, res, next) => {
  try {
    const data = { ...req.body }; delete data._id;
    const material = await prisma.buildingMaterial.create({ data });
    res.status(201).json(addId(material));
  } catch (err) { next(err); }
};

exports.updateMaterial = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    const material = await prisma.buildingMaterial.update({ where: { id: req.params.id }, data });
    res.json(addId(material));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Material not found' });
    next(err);
  }
};

exports.deleteMaterial = async (req, res, next) => {
  try {
    await prisma.buildingMaterial.delete({ where: { id: req.params.id } });
    res.json({ message: 'Material deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Material not found' });
    next(err);
  }
};

// ─── Seed default construction materials ───
const DEFAULT_MATERIALS = [
  // Concrete
  { name: 'M20 Concrete', category: 'concrete', unit: 'cum', cost_per_unit: 5500, density: 2400, compressive_strength: 20, tensile_strength: 2, thermal_conductivity: 1.7, fire_rating: 'A1', color: '#b8b8b0', roughness: 0.8, metalness: 0, opacity: 1, specifications: { grade: 'M20', standard: 'IS 456:2000', size: 'N/A', finish: 'Raw' } },
  { name: 'M25 Concrete', category: 'concrete', unit: 'cum', cost_per_unit: 6200, density: 2400, compressive_strength: 25, tensile_strength: 2.5, thermal_conductivity: 1.7, fire_rating: 'A1', color: '#a8a8a0', roughness: 0.8, metalness: 0, opacity: 1, specifications: { grade: 'M25', standard: 'IS 456:2000', size: 'N/A', finish: 'Raw' } },
  { name: 'M30 Concrete', category: 'concrete', unit: 'cum', cost_per_unit: 6800, density: 2500, compressive_strength: 30, tensile_strength: 3, thermal_conductivity: 1.8, fire_rating: 'A1', color: '#989890', roughness: 0.75, metalness: 0, opacity: 1, specifications: { grade: 'M30', standard: 'IS 456:2000', size: 'N/A', finish: 'Raw' } },
  // Steel
  { name: 'TMT Fe500 Steel Bar', category: 'steel', unit: 'kg', cost_per_unit: 65, density: 7850, compressive_strength: 500, tensile_strength: 545, thermal_conductivity: 50, fire_rating: 'A1', color: '#5a5a5a', roughness: 0.4, metalness: 0.9, opacity: 1, specifications: { grade: 'Fe500', standard: 'IS 1786:2008', size: '12mm, 16mm, 20mm', finish: 'Ribbed' } },
  { name: 'Structural Steel I-Beam', category: 'steel', unit: 'kg', cost_per_unit: 72, density: 7850, compressive_strength: 250, tensile_strength: 410, thermal_conductivity: 50, fire_rating: 'A1', color: '#4a4a4a', roughness: 0.35, metalness: 0.95, opacity: 1, specifications: { grade: 'IS 2062 E250', standard: 'IS 2062', size: 'ISMB 200-600', finish: 'Mill' } },
  // Brick
  { name: 'Red Clay Brick', category: 'brick', unit: 'nos', cost_per_unit: 8, density: 1800, compressive_strength: 7.5, tensile_strength: 0.5, thermal_conductivity: 0.8, fire_rating: 'A1', color: '#c4634e', roughness: 0.85, metalness: 0, opacity: 1, specifications: { grade: 'Class I', standard: 'IS 1077', size: '230x110x75mm', finish: 'Rustic' } },
  { name: 'AAC Block', category: 'brick', unit: 'nos', cost_per_unit: 55, density: 600, compressive_strength: 4, tensile_strength: 0.3, thermal_conductivity: 0.16, fire_rating: 'A1', color: '#e0ddd5', roughness: 0.6, metalness: 0, opacity: 1, specifications: { grade: 'Grade 1', standard: 'IS 2185', size: '600x200x200mm', finish: 'Smooth' } },
  { name: 'Fly Ash Brick', category: 'brick', unit: 'nos', cost_per_unit: 7, density: 1700, compressive_strength: 9, tensile_strength: 0.6, thermal_conductivity: 0.7, fire_rating: 'A1', color: '#a0a0a0', roughness: 0.7, metalness: 0, opacity: 1, specifications: { grade: 'Class I', standard: 'IS 12894', size: '230x110x75mm', finish: 'Smooth' } },
  // Granite & Marble
  { name: 'Black Granite', category: 'granite', unit: 'sqft', cost_per_unit: 180, density: 2750, compressive_strength: 130, tensile_strength: 15, thermal_conductivity: 2.8, fire_rating: 'A1', color: '#1a1a1a', roughness: 0.15, metalness: 0.1, opacity: 1, specifications: { grade: 'Premium', standard: 'IS 3622', size: '600x600mm', finish: 'Polished' } },
  { name: 'Italian White Marble', category: 'marble', unit: 'sqft', cost_per_unit: 350, density: 2700, compressive_strength: 70, tensile_strength: 8, thermal_conductivity: 2.5, fire_rating: 'A1', color: '#f5f0e8', roughness: 0.1, metalness: 0.05, opacity: 1, specifications: { grade: 'Premium', standard: 'IS 1130', size: '600x600mm', finish: 'Mirror Polished' } },
  // Tile
  { name: 'Vitrified Floor Tile', category: 'tile', unit: 'sqft', cost_per_unit: 45, density: 2200, compressive_strength: 35, tensile_strength: 3, thermal_conductivity: 1.3, fire_rating: 'A1', color: '#ddd8d0', roughness: 0.2, metalness: 0.05, opacity: 1, specifications: { grade: 'Grade A', standard: 'IS 15622', size: '600x600mm', finish: 'Glossy' } },
  { name: 'Anti-Skid Bathroom Tile', category: 'tile', unit: 'sqft', cost_per_unit: 55, density: 2200, compressive_strength: 30, tensile_strength: 2.5, thermal_conductivity: 1.2, fire_rating: 'A1', color: '#c8c0b5', roughness: 0.9, metalness: 0, opacity: 1, specifications: { grade: 'Grade A', standard: 'IS 15622', size: '300x300mm', finish: 'Matte Anti-Skid' } },
  { name: 'Ceramic Wall Tile', category: 'tile', unit: 'sqft', cost_per_unit: 35, density: 2100, compressive_strength: 25, tensile_strength: 2, thermal_conductivity: 1.0, fire_rating: 'A1', color: '#f0ece5', roughness: 0.15, metalness: 0.02, opacity: 1, specifications: { grade: 'Grade A', standard: 'IS 13753', size: '300x450mm', finish: 'Glossy' } },
  // Wood
  { name: 'Teak Wood', category: 'wood', unit: 'cft', cost_per_unit: 3500, density: 650, compressive_strength: 55, tensile_strength: 100, thermal_conductivity: 0.15, fire_rating: 'D', color: '#8B6914', roughness: 0.55, metalness: 0, opacity: 1, specifications: { grade: 'Grade I', standard: 'IS 401', size: 'Custom', finish: 'Polished' } },
  { name: 'Plywood (19mm BWR)', category: 'wood', unit: 'sqft', cost_per_unit: 75, density: 550, compressive_strength: 20, tensile_strength: 30, thermal_conductivity: 0.13, fire_rating: 'D', color: '#c4a055', roughness: 0.5, metalness: 0, opacity: 1, specifications: { grade: 'BWR', standard: 'IS 303', size: '8x4 ft', finish: 'Sanded' } },
  // Glass
  { name: 'Tempered Glass (12mm)', category: 'glass', unit: 'sqft', cost_per_unit: 220, density: 2500, compressive_strength: 120, tensile_strength: 40, thermal_conductivity: 1.0, fire_rating: 'A1', color: '#d4e8f0', roughness: 0.05, metalness: 0.1, opacity: 0.3, specifications: { grade: 'Type A', standard: 'IS 2553', size: 'Custom', finish: 'Clear' } },
  { name: 'Double-Glazed Unit', category: 'glass', unit: 'sqft', cost_per_unit: 450, density: 2500, compressive_strength: 120, tensile_strength: 40, thermal_conductivity: 0.3, fire_rating: 'A1', color: '#c8dce8', roughness: 0.05, metalness: 0.12, opacity: 0.25, specifications: { grade: 'Low-E', standard: 'IS 2553', size: 'Custom', finish: 'Coated' } },
  // Paint
  { name: 'Interior Emulsion Paint', category: 'paint', unit: 'ltr', cost_per_unit: 280, density: 1400, compressive_strength: 0, tensile_strength: 0, thermal_conductivity: 0.2, fire_rating: 'B', color: '#f8f5f0', roughness: 0.3, metalness: 0, opacity: 1, specifications: { grade: 'Premium', standard: 'IS 15489', size: '20L bucket', finish: 'Silk Matt' } },
  { name: 'Exterior Weatherproof Paint', category: 'paint', unit: 'ltr', cost_per_unit: 380, density: 1500, compressive_strength: 0, tensile_strength: 0, thermal_conductivity: 0.2, fire_rating: 'B', color: '#e8e0d0', roughness: 0.4, metalness: 0, opacity: 1, specifications: { grade: 'Premium', standard: 'IS 15489', size: '20L bucket', finish: 'Smooth Matt' } },
  // Cement & Sand
  { name: 'OPC 53 Grade Cement', category: 'cement', unit: 'bag', cost_per_unit: 380, density: 1500, compressive_strength: 53, tensile_strength: 4, thermal_conductivity: 0.9, fire_rating: 'A1', color: '#8a8a80', roughness: 0.9, metalness: 0, opacity: 1, specifications: { grade: '53 Grade', standard: 'IS 12269', size: '50kg bag', finish: 'Powder' } },
  { name: 'PPC Cement', category: 'cement', unit: 'bag', cost_per_unit: 360, density: 1400, compressive_strength: 33, tensile_strength: 3, thermal_conductivity: 0.8, fire_rating: 'A1', color: '#909085', roughness: 0.9, metalness: 0, opacity: 1, specifications: { grade: 'PPC', standard: 'IS 1489', size: '50kg bag', finish: 'Powder' } },
  { name: 'River Sand', category: 'sand', unit: 'cum', cost_per_unit: 2500, density: 1600, compressive_strength: 0, tensile_strength: 0, thermal_conductivity: 0.3, fire_rating: 'A1', color: '#d4c8a0', roughness: 0.95, metalness: 0, opacity: 1, specifications: { grade: 'Zone II', standard: 'IS 383', size: 'Fine', finish: 'Natural' } },
  { name: 'M-Sand', category: 'sand', unit: 'cum', cost_per_unit: 1800, density: 1700, compressive_strength: 0, tensile_strength: 0, thermal_conductivity: 0.35, fire_rating: 'A1', color: '#c0b898', roughness: 0.9, metalness: 0, opacity: 1, specifications: { grade: 'Zone II', standard: 'IS 383', size: 'Fine', finish: 'Manufactured' } },
  // Waterproofing & Insulation
  { name: 'APP Waterproofing Membrane', category: 'waterproofing', unit: 'sqm', cost_per_unit: 120, density: 1100, compressive_strength: 0, tensile_strength: 8, thermal_conductivity: 0.17, fire_rating: 'E', color: '#2a2a2a', roughness: 0.6, metalness: 0, opacity: 1, specifications: { grade: 'Type II', standard: 'IS 14930', size: '1m x 10m roll', finish: 'Textured' } },
  { name: 'XPS Insulation Board', category: 'insulation', unit: 'sqm', cost_per_unit: 350, density: 35, compressive_strength: 0.3, tensile_strength: 0.2, thermal_conductivity: 0.033, fire_rating: 'E', color: '#e0a0d0', roughness: 0.4, metalness: 0, opacity: 1, specifications: { grade: '50mm', standard: 'IS 4671', size: '1200x600mm', finish: 'Smooth' } },
  // Aluminium & PVC
  { name: 'Aluminium Window Section', category: 'aluminium', unit: 'kg', cost_per_unit: 350, density: 2700, compressive_strength: 200, tensile_strength: 310, thermal_conductivity: 200, fire_rating: 'A1', color: '#c0c0c0', roughness: 0.2, metalness: 0.95, opacity: 1, specifications: { grade: '6063-T6', standard: 'IS 733', size: 'Custom', finish: 'Anodized Silver' } },
  { name: 'PVC Pipe (4 inch)', category: 'pvc', unit: 'rft', cost_per_unit: 85, density: 1400, compressive_strength: 55, tensile_strength: 45, thermal_conductivity: 0.16, fire_rating: 'B', color: '#d0d0d0', roughness: 0.3, metalness: 0, opacity: 1, specifications: { grade: 'Type A', standard: 'IS 4985', size: '4 inch / 110mm', finish: 'Smooth' } },
  // Roofing
  { name: 'Clay Roof Tile', category: 'roofing', unit: 'nos', cost_per_unit: 35, density: 1900, compressive_strength: 15, tensile_strength: 1.5, thermal_conductivity: 0.8, fire_rating: 'A1', color: '#a0503a', roughness: 0.8, metalness: 0, opacity: 1, specifications: { grade: 'Mangalore', standard: 'IS 654', size: '260x165mm', finish: 'Traditional' } },
  { name: 'Metal Roofing Sheet', category: 'roofing', unit: 'sqm', cost_per_unit: 480, density: 7800, compressive_strength: 250, tensile_strength: 350, thermal_conductivity: 45, fire_rating: 'A1', color: '#607080', roughness: 0.3, metalness: 0.85, opacity: 1, specifications: { grade: 'GP 0.5mm', standard: 'IS 277', size: '1050mm wide', finish: 'Color Coated' } },
  // Flooring
  { name: 'Laminate Flooring', category: 'flooring', unit: 'sqft', cost_per_unit: 85, density: 850, compressive_strength: 0, tensile_strength: 0, thermal_conductivity: 0.13, fire_rating: 'Cfl', color: '#a08050', roughness: 0.35, metalness: 0.05, opacity: 1, specifications: { grade: 'AC4', standard: 'EN 13329', size: '1380x193mm', finish: 'Wood Texture' } },
  { name: 'Epoxy Floor Coating', category: 'flooring', unit: 'sqft', cost_per_unit: 65, density: 1200, compressive_strength: 80, tensile_strength: 10, thermal_conductivity: 0.2, fire_rating: 'B', color: '#b0b8c0', roughness: 0.1, metalness: 0.15, opacity: 1, specifications: { grade: 'Industrial', standard: 'ASTM D4060', size: 'N/A', finish: 'High Gloss' } },
];

exports.seedDefaults = async (req, res, next) => {
  try {
    const existing = await prisma.buildingMaterial.count({ where: { is_default: true } });
    if (existing > 0) {
      return res.json({ message: `${existing} default materials already exist`, count: existing });
    }
    const materials = [];
    for (const mat of DEFAULT_MATERIALS) {
      const created = await prisma.buildingMaterial.create({
        data: { ...mat, is_default: true },
      });
      materials.push(addId(created));
    }
    res.status(201).json({ message: `${materials.length} default materials seeded`, count: materials.length, materials });
  } catch (err) { next(err); }
};
