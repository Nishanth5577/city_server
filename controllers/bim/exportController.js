const BIMProject = require('../../models/bim/BIMProject');
const BIMFloor = require('../../models/bim/Floor');
const BIMDesignHistory = require('../../models/bim/DesignHistory');

// ─── Helpers ────────────────────────────────────────────────────
function calcWallLength(wall) {
  if (!wall?.start_point || !wall?.end_point) return 0;
  const dx = wall.end_point.x - wall.start_point.x;
  const dy = wall.end_point.y - wall.start_point.y;
  return Math.sqrt(dx * dx + dy * dy) / 1000; // meters
}

function generateOBJContent(floor) {
  const lines = ['# BIM Design Studio OBJ Export', `# Floor: ${floor.floor_name}`, ''];
  let vertexOffset = 0;

  // Walls → boxes
  (floor.elements?.walls || []).forEach((wall, wi) => {
    if (!wall?.start_point || !wall?.end_point) return;
    const sx = wall.start_point.x / 1000;
    const sy = wall.start_point.y / 1000;
    const ex = wall.end_point.x / 1000;
    const ey = wall.end_point.y / 1000;
    const h = (wall.height || 3000) / 1000;
    const t = (wall.thickness || 230) / 2000;
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;
    const nx = -dy / len * t;
    const ny = dx / len * t;

    lines.push(`o Wall_${wi}`);
    // 8 vertices of the wall box
    lines.push(`v ${sx + nx} 0 ${sy + ny}`);
    lines.push(`v ${sx - nx} 0 ${sy - ny}`);
    lines.push(`v ${ex - nx} 0 ${ey - ny}`);
    lines.push(`v ${ex + nx} 0 ${ey + ny}`);
    lines.push(`v ${sx + nx} ${h} ${sy + ny}`);
    lines.push(`v ${sx - nx} ${h} ${sy - ny}`);
    lines.push(`v ${ex - nx} ${h} ${ey - ny}`);
    lines.push(`v ${ex + nx} ${h} ${ey + ny}`);
    // 6 faces
    const o = vertexOffset;
    lines.push(`f ${o + 1} ${o + 2} ${o + 3} ${o + 4}`);
    lines.push(`f ${o + 5} ${o + 8} ${o + 7} ${o + 6}`);
    lines.push(`f ${o + 1} ${o + 5} ${o + 6} ${o + 2}`);
    lines.push(`f ${o + 2} ${o + 6} ${o + 7} ${o + 3}`);
    lines.push(`f ${o + 3} ${o + 7} ${o + 8} ${o + 4}`);
    lines.push(`f ${o + 4} ${o + 8} ${o + 5} ${o + 1}`);
    vertexOffset += 8;
  });

  // Columns → boxes
  (floor.elements?.columns || []).forEach((col, ci) => {
    if (!col?.position) return;
    const x = col.position.x / 1000;
    const z = col.position.y / 1000;
    const w = (col.width || 300) / 2000;
    const d = (col.depth || col.width || 300) / 2000;
    const h = (col.height || 3000) / 1000;

    lines.push(`o Column_${ci}`);
    lines.push(`v ${x - w} 0 ${z - d}`);
    lines.push(`v ${x + w} 0 ${z - d}`);
    lines.push(`v ${x + w} 0 ${z + d}`);
    lines.push(`v ${x - w} 0 ${z + d}`);
    lines.push(`v ${x - w} ${h} ${z - d}`);
    lines.push(`v ${x + w} ${h} ${z - d}`);
    lines.push(`v ${x + w} ${h} ${z + d}`);
    lines.push(`v ${x - w} ${h} ${z + d}`);
    const o = vertexOffset;
    lines.push(`f ${o + 1} ${o + 2} ${o + 3} ${o + 4}`);
    lines.push(`f ${o + 5} ${o + 8} ${o + 7} ${o + 6}`);
    lines.push(`f ${o + 1} ${o + 5} ${o + 6} ${o + 2}`);
    lines.push(`f ${o + 2} ${o + 6} ${o + 7} ${o + 3}`);
    lines.push(`f ${o + 3} ${o + 7} ${o + 8} ${o + 4}`);
    lines.push(`f ${o + 4} ${o + 8} ${o + 5} ${o + 1}`);
    vertexOffset += 8;
  });

  return lines.join('\n');
}

function generateQuantityTakeoff(floor) {
  const takeoff = {
    floor_name: floor.floor_name,
    floor_number: floor.floor_number,
    total_area: floor.total_area || 0,
    elements: {
      walls: {
        count: 0,
        total_length_m: 0,
        total_area_sqm: 0,
        total_volume_cum: 0,
        items: [],
      },
      columns: { count: 0, total_volume_cum: 0, items: [] },
      beams: { count: 0, total_length_m: 0, total_volume_cum: 0, items: [] },
      doors: { count: 0, by_type: {}, items: [] },
      windows: { count: 0, by_type: {}, items: [] },
      stairs: { count: 0 },
      furniture: { count: 0, by_category: {} },
      rooms: { count: 0, total_area_sqm: 0, items: [] },
    },
  };

  (floor.elements?.walls || []).forEach(wall => {
    const len = calcWallLength(wall);
    if (len <= 0) return;
    const h = (wall.height || 3000) / 1000;
    const t = (wall.thickness || 230) / 1000;
    const area = len * h;
    const vol = area * t;
    takeoff.elements.walls.count++;
    takeoff.elements.walls.total_length_m += len;
    takeoff.elements.walls.total_area_sqm += area;
    takeoff.elements.walls.total_volume_cum += vol;
    takeoff.elements.walls.items.push({
      name: wall.wall_type || wall.name || 'Wall',
      length: +len.toFixed(2),
      height: +h.toFixed(2),
      thickness: +(t * 1000).toFixed(0),
      area: +area.toFixed(2),
      volume: +vol.toFixed(3),
    });
  });

  (floor.elements?.columns || []).forEach(col => {
    if (!col?.position) return;
    const w = (col.width || 300) / 1000;
    const d = (col.depth || col.width || 300) / 1000;
    const h = (col.height || 3000) / 1000;
    const vol = w * d * h;
    takeoff.elements.columns.count++;
    takeoff.elements.columns.total_volume_cum += vol;
    takeoff.elements.columns.items.push({
      name: col.name || `${col.width || 300}×${col.depth || col.width || 300}`,
      size: `${col.width || 300}×${col.depth || col.width || 300}`,
      height: +h.toFixed(2),
      volume: +vol.toFixed(3),
    });
  });

  (floor.elements?.doors || []).forEach(door => {
    takeoff.elements.doors.count++;
    const type = door.door_type || 'single';
    takeoff.elements.doors.by_type[type] = (takeoff.elements.doors.by_type[type] || 0) + 1;
    takeoff.elements.doors.items.push({
      name: door.name || door.door_type || 'Door',
      type,
      size: `${door.width || 900}×${door.height || 2100}`,
    });
  });

  (floor.elements?.windows || []).forEach(win => {
    takeoff.elements.windows.count++;
    const type = win.window_type || 'casement';
    takeoff.elements.windows.by_type[type] = (takeoff.elements.windows.by_type[type] || 0) + 1;
    takeoff.elements.windows.items.push({
      name: win.name || win.window_type || 'Window',
      type,
      size: `${win.width || 1200}×${win.height || 1200}`,
    });
  });

  takeoff.elements.stairs.count = (floor.elements?.stairs || []).length;

  (floor.elements?.furniture || []).forEach(f => {
    takeoff.elements.furniture.count++;
    const cat = f.category || 'other';
    takeoff.elements.furniture.by_category[cat] = (takeoff.elements.furniture.by_category[cat] || 0) + 1;
  });

  (floor.rooms || []).forEach(room => {
    takeoff.elements.rooms.count++;
    takeoff.elements.rooms.total_area_sqm += (room.area || 0);
    takeoff.elements.rooms.items.push({
      name: room.name || room.room_type || 'Room',
      type: room.room_type,
      area: room.area || 0,
    });
  });

  // Round totals
  takeoff.elements.walls.total_length_m = +takeoff.elements.walls.total_length_m.toFixed(2);
  takeoff.elements.walls.total_area_sqm = +takeoff.elements.walls.total_area_sqm.toFixed(2);
  takeoff.elements.walls.total_volume_cum = +takeoff.elements.walls.total_volume_cum.toFixed(3);
  takeoff.elements.columns.total_volume_cum = +takeoff.elements.columns.total_volume_cum.toFixed(3);

  return takeoff;
}

// ─── Export Project ─────────────────────────────────────────────
// @desc    Export design in various formats
// @route   GET /api/bim/exports/:projectId
exports.exportProject = async (req, res, next) => {
  try {
    const project = await BIMProject.findById(req.params.projectId)
      .populate('project_id', 'project_name project_id client_name')
      .populate('created_by', 'name email')
      .populate({
        path: 'buildings',
        populate: {
          path: 'floors',
          populate: [
            { path: 'rooms' },
            { path: 'elements.walls' },
            { path: 'elements.columns' },
            { path: 'elements.beams' },
            { path: 'elements.doors' },
            { path: 'elements.windows' },
            { path: 'elements.stairs' },
            { path: 'elements.furniture' },
          ],
        },
      });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { format } = req.query; // json, summary, obj, gltf_meta, boq

    switch (format) {
      case 'summary': {
        const floors = [];
        for (const building of project.buildings || []) {
          for (const floor of building.floors || []) {
            floors.push({
              building_name: building.name,
              floor_name: floor.floor_name,
              floor_number: floor.floor_number,
              total_area: floor.total_area,
              rooms: (floor.rooms || []).length,
              walls: (floor.elements?.walls || []).length,
              columns: (floor.elements?.columns || []).length,
              doors: (floor.elements?.doors || []).length,
              windows: (floor.elements?.windows || []).length,
            });
          }
        }
        return res.json({
          project_name: project.design_name,
          erp_project: project.project_id?.project_name,
          client: project.project_id?.client_name,
          status: project.status,
          created_by: project.created_by?.name,
          created_at: project.createdAt,
          site_data: project.site_data,
          buildings: (project.buildings || []).length,
          floors,
        });
      }

      case 'obj': {
        // OBJ geometry export — one file per floor
        const objParts = [];
        for (const building of project.buildings || []) {
          for (const floor of building.floors || []) {
            objParts.push({
              building: building.name,
              floor: floor.floor_name,
              obj_content: generateOBJContent(floor),
            });
          }
        }
        return res.json({
          project_name: project.design_name,
          format: 'obj',
          files: objParts,
        });
      }

      case 'gltf_meta': {
        // GLTF metadata for client-side Three.js export
        return res.json({
          format: 'gltf',
          project_name: project.design_name,
          generator: 'BIM Design Studio v1.0',
          version: '2.0',
          scene_data: project,
          instructions: 'Use Three.js GLTFExporter on client side with this scene data.',
        });
      }

      case 'boq': {
        // Bill of Quantities / Quantity Takeoff
        const takeoffs = [];
        for (const building of project.buildings || []) {
          for (const floor of building.floors || []) {
            takeoffs.push({
              building: building.name,
              ...generateQuantityTakeoff(floor),
            });
          }
        }
        return res.json({
          project_name: project.design_name,
          format: 'boq',
          generated_at: new Date().toISOString(),
          takeoffs,
        });
      }

      default: {
        // Full JSON export
        return res.json(project);
      }
    }
  } catch (err) { next(err); }
};

// ─── Export Floor Canvas ────────────────────────────────────────
// @route   GET /api/bim/exports/floor/:floorId
exports.exportFloor = async (req, res, next) => {
  try {
    const floor = await BIMFloor.findById(req.params.floorId)
      .populate('rooms')
      .populate('elements.walls')
      .populate('elements.columns')
      .populate('elements.beams')
      .populate('elements.doors')
      .populate('elements.windows')
      .populate('elements.stairs')
      .populate('elements.furniture');

    if (!floor) return res.status(404).json({ message: 'Floor not found' });

    const { format } = req.query;

    if (format === 'obj') {
      const content = generateOBJContent(floor);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${floor.floor_name || 'floor'}.obj"`);
      return res.send(content);
    }

    if (format === 'boq') {
      return res.json(generateQuantityTakeoff(floor));
    }

    res.json(floor);
  } catch (err) { next(err); }
};

// ─── Design History ─────────────────────────────────────────────
// @route   GET /api/bim/exports/:projectId/history
exports.getDesignHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const history = await BIMDesignHistory.find({ bim_project_id: req.params.projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(+limit)
      .populate('user_id', 'name email avatar');

    const total = await BIMDesignHistory.countDocuments({ bim_project_id: req.params.projectId });

    res.json({ history, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// @route   POST /api/bim/exports/:projectId/history
exports.addDesignHistory = async (req, res, next) => {
  try {
    const entry = await BIMDesignHistory.create({
      bim_project_id: req.params.projectId,
      user_id: req.user._id,
      company_id: req.user.company,
      ...req.body,
    });
    res.status(201).json(entry);
  } catch (err) { next(err); }
};
