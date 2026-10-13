// ═══════════════════════════════════════════════════════════════
// BIM Command Routes — Process BIM commands from the client
// ═══════════════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const prisma = require('../../config/prisma');

/**
 * POST /api/bim/commands
 * Execute a batch of BIM commands on the server
 * Body: { projectId, commands: [{ type, payload }] }
 */
router.post('/', auth, async (req, res) => {
  try {
    const { projectId, commands } = req.body;
    if (!projectId || !commands?.length) {
      return res.status(400).json({ message: 'projectId and commands[] required' });
    }

    const project = await prisma.bIMProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'BIM Project not found' });

    // All BIM element commands are stored in the building_data JSON
    const buildingData = project.building_data || { walls: [], doors: [], windows: [], rooms: [], floors: [], buildings: [] };
    const results = [];

    for (const cmd of commands) {
      const { type, payload } = cmd;
      let result = null;

      // Determine which array to operate on
      const typeMap = {
        'WALL': 'walls', 'DOOR': 'doors', 'WINDOW': 'windows',
        'ROOM': 'rooms', 'FLOOR': 'floors', 'BUILDING': 'buildings',
      };

      const [action, entityType] = type.split('_');
      const arrayKey = typeMap[entityType] || entityType?.toLowerCase() + 's';

      if (!buildingData[arrayKey]) buildingData[arrayKey] = [];

      switch (action) {
        case 'CREATE':
          const newItem = { ...payload, id: `${entityType?.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date() };
          buildingData[arrayKey].push(newItem);
          result = newItem;
          break;
        case 'UPDATE':
          const idx = buildingData[arrayKey].findIndex(i => i.id === payload.id);
          if (idx >= 0) {
            buildingData[arrayKey][idx] = { ...buildingData[arrayKey][idx], ...payload };
            result = buildingData[arrayKey][idx];
          }
          break;
        case 'DELETE':
          buildingData[arrayKey] = buildingData[arrayKey].filter(i => i.id !== payload.id);
          result = { deleted: payload.id };
          break;
        default:
          result = { skipped: type };
      }

      results.push({ type, success: true, result });
    }

    // Save updated building data
    await prisma.bIMProject.update({ where: { id: projectId }, data: { building_data: buildingData } });

    res.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('BIM Command error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/bim/commands/save-model
 * Save the full client-side model in one batch
 */
router.post('/save-model', auth, async (req, res) => {
  try {
    const { projectId, building, floors, walls, doors, windows, rooms, slabs, roofs, stairs, columns, beams, furniture, landscape, site } = req.body;

    if (!projectId) return res.status(400).json({ message: 'projectId required' });

    await prisma.bIMProject.update({
      where: { id: projectId },
      data: {
        building_data: { building, floors, walls, doors, windows, rooms, slabs, roofs, stairs, columns, beams, furniture, landscape, site },
      },
    });

    res.json({ success: true, message: 'Model saved', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Save model error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/bim/commands/load-model/:projectId
 * Load the full model
 */
router.get('/load-model/:projectId', auth, async (req, res) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'BIM Project not found' });

    res.json({
      success: true,
      project: { _id: project.id, name: project.design_name, project_name: project.design_name },
      data: project.building_data || null,
    });
  } catch (error) {
    console.error('Load model error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
