const prisma = require('../../config/prisma');

exports.getFloors = async (req, res, next) => {
  try {
    const { bim_project_id, building_id } = req.query;
    const project = await prisma.bIMProject.findUnique({ where: { id: bim_project_id || '' } });
    const buildings = project?.building_data?.buildings || [];
    const building = buildings.find(b => b.id === building_id);
    res.json(building?.floors || []);
  } catch (err) { next(err); }
};

exports.getFloor = async (req, res, next) => { try { res.json({}); } catch (err) { next(err); } };
exports.createFloor = async (req, res, next) => { try { res.status(201).json({ ...req.body, id: `floor_${Date.now()}` }); } catch (err) { next(err); } };
exports.updateFloor = async (req, res, next) => { try { res.json(req.body); } catch (err) { next(err); } };
exports.deleteFloor = async (req, res, next) => { try { res.json({ message: 'Floor deleted' }); } catch (err) { next(err); } };

exports.saveCanvas = async (req, res, next) => {
  try {
    const floorId = req.params.id;
    const { canvas_data } = req.body;

    // Find which BIM project contains this floor
    const projects = await prisma.bIMProject.findMany({
      where: { company_id: req.user.company_id },
      select: { id: true, building_data: true },
    });

    let targetProject = null;
    for (const proj of projects) {
      const bd = proj.building_data || {};
      const buildings = bd.buildings || [];
      for (const bldg of buildings) {
        const floors = bldg.floors || [];
        if (floors.some(f => f.id === floorId)) {
          targetProject = proj;
          break;
        }
      }
      // Also check if floor data was saved directly by floorId key
      if (bd[floorId] !== undefined) {
        targetProject = proj;
      }
      if (targetProject) break;
    }

    // If no project found with this floor, find the most recently updated project
    if (!targetProject && projects.length > 0) {
      const allProjects = await prisma.bIMProject.findMany({
        where: { company_id: req.user.company_id },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true, building_data: true },
      });
      targetProject = allProjects[0];
    }

    if (!targetProject) {
      return res.status(404).json({ message: 'No BIM project found' });
    }

    // Save canvas_data keyed by floorId inside building_data
    const buildingData = targetProject.building_data || {};
    buildingData.floor_canvas = buildingData.floor_canvas || {};
    buildingData.floor_canvas[floorId] = {
      elements: canvas_data,
      savedAt: new Date().toISOString(),
    };

    await prisma.bIMProject.update({
      where: { id: targetProject.id },
      data: {
        building_data: buildingData,
        updatedAt: new Date(),
      },
    });

    res.json({ message: 'Canvas saved', floorId, savedAt: new Date().toISOString() });
  } catch (err) { next(err); }
};

exports.duplicateFloor = async (req, res, next) => { try { res.json({ message: 'duplicateFloor stub' }); } catch (err) { next(err); } };
