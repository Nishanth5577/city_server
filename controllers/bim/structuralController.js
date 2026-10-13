const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

// GET /api/bim/structural — list structural designs
exports.getDesigns = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const where = {};
    if (bim_project_id) where.bim_project_id = bim_project_id;
    const designs = await prisma.structuralDesign.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(designs.map(addId));
  } catch (err) { next(err); }
};

// GET /api/bim/structural/:id
exports.getDesign = async (req, res, next) => {
  try {
    const design = await prisma.structuralDesign.findUnique({ where: { id: req.params.id } });
    if (!design) return res.status(404).json({ message: 'Structural design not found' });
    res.json(addId(design));
  } catch (err) { next(err); }
};

// POST /api/bim/structural
exports.createDesign = async (req, res, next) => {
  try {
    const { bim_project_id, design_data } = req.body;
    const design = await prisma.structuralDesign.create({
      data: { bim_project_id, design_data: design_data || {}, created_by: req.user.userId },
    });
    res.status(201).json(addId(design));
  } catch (err) { next(err); }
};

// PUT /api/bim/structural/:id
exports.updateDesign = async (req, res, next) => {
  try {
    const { _id, ...data } = req.body;
    const design = await prisma.structuralDesign.update({ where: { id: req.params.id }, data });
    res.json(addId(design));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Structural design not found' });
    next(err);
  }
};

// POST /api/bim/structural/analyze — structural analysis from building data
exports.analyzeStructure = async (req, res, next) => {
  try {
    const { building_data } = req.body;
    if (!building_data) return res.json({ analysis: null, message: 'No building data' });

    const walls = building_data.walls || [];
    const floors = building_data.floors || [];
    const columns = building_data.columns || [];
    const beams = building_data.beams || [];

    // Simple structural analysis based on element counts
    const totalWallLength = walls.reduce((sum, w) => sum + (w.length || 3), 0);
    const totalFloorArea = floors.reduce((sum, f) => sum + (f.width || 10) * (f.depth || 10), 0) || 80;
    const loadBearingWalls = walls.filter(w => w.thickness >= 0.2).length;
    const totalLoad = totalFloorArea * 12 + walls.length * 8; // kN approximate

    const warnings = [];
    if (walls.length < 4) warnings.push({ severity: 'high', message: 'Insufficient wall count for structural stability' });
    if (loadBearingWalls < 2) warnings.push({ severity: 'medium', message: 'Consider adding more load-bearing walls' });
    if (columns.length === 0 && floors.length > 1) warnings.push({ severity: 'medium', message: 'Multi-story structure should have columns' });
    if (beams.length === 0 && totalFloorArea > 40) warnings.push({ severity: 'low', message: 'Consider adding beams for larger floor spans' });

    const score = Math.min(100, Math.max(0, 100 - warnings.filter(w => w.severity === 'high').length * 30 - warnings.filter(w => w.severity === 'medium').length * 15 - warnings.filter(w => w.severity === 'low').length * 5));

    res.json({
      analysis: {
        structuralScore: score,
        totalWallLength: Math.round(totalWallLength * 100) / 100,
        totalFloorArea: Math.round(totalFloorArea * 100) / 100,
        loadBearingWalls,
        nonLoadBearingWalls: walls.length - loadBearingWalls,
        columnCount: columns.length,
        beamCount: beams.length,
        estimatedTotalLoad: Math.round(totalLoad),
        loadUnit: 'kN',
      },
      warnings,
      recommendations: [
        loadBearingWalls < walls.length / 2 ? 'Increase wall thickness to 230mm for load-bearing walls' : null,
        columns.length === 0 ? 'Add RCC columns at corners and intersections for better load distribution' : null,
        beams.length === 0 ? 'Add tie beams to connect columns and distribute loads' : null,
      ].filter(Boolean),
    });
  } catch (err) { next(err); }
};

// DELETE /api/bim/structural/:id
exports.deleteDesign = async (req, res, next) => {
  try {
    await prisma.structuralDesign.delete({ where: { id: req.params.id } });
    res.json({ message: 'Structural design deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Structural design not found' });
    next(err);
  }
};
