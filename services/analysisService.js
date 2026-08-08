/**
 * BIM Analysis Service — Server-Side Calculations
 * Handles quantity takeoff, natural lighting analysis,
 * ventilation analysis, and space optimization checks.
 */

// ─── NBC (National Building Code) Standards ─────────────────────
const NBC_STANDARDS = {
  min_room_height: 2750, // mm — minimum clear height
  min_carpet_area: {
    bedroom: 9.5, // sqm
    living: 9.5,
    kitchen: 5.5,
    bathroom: 2.8,
    toilet: 1.1,
    staircase_width: 1000, // mm
  },
  ventilation: {
    min_opening_ratio: 0.1, // Window area / Floor area
    min_kitchen_opening: 0.15,
    min_bathroom_opening: 0.05,
  },
  natural_light: {
    min_window_ratio: 0.1, // Window area / Floor area (10%)
  },
  fire_safety: {
    max_travel_distance: 22500, // mm — to nearest exit
    min_exit_width: 1050, // mm
    min_corridor_width: 1200, // mm
  },
};

// ─── Quantity Takeoff ───────────────────────────────────────────
function generateQuantityTakeoff(elements) {
  const takeoff = {
    walls: { count: 0, total_length: 0, total_area: 0, total_volume: 0 },
    columns: { count: 0, total_volume: 0, concrete_cum: 0 },
    beams: { count: 0, total_length: 0, total_volume: 0 },
    doors: { count: 0, by_type: {} },
    windows: { count: 0, by_type: {} },
    stairs: { count: 0 },
    furniture: { count: 0, by_category: {} },
    rooms: { count: 0, total_area: 0 },
  };

  (elements?.walls || []).forEach(wall => {
    if (!wall?.start_point || !wall?.end_point) return;
    const dx = wall.end_point.x - wall.start_point.x;
    const dy = wall.end_point.y - wall.start_point.y;
    const length = Math.sqrt(dx * dx + dy * dy) / 1000;
    const height = (wall.height || 3000) / 1000;
    const thickness = (wall.thickness || 230) / 1000;
    takeoff.walls.count++;
    takeoff.walls.total_length += length;
    takeoff.walls.total_area += length * height;
    takeoff.walls.total_volume += length * height * thickness;
  });

  (elements?.columns || []).forEach(col => {
    if (!col?.position) return;
    takeoff.columns.count++;
    const w = (col.width || 300) / 1000;
    const d = (col.depth || col.width || 300) / 1000;
    const h = (col.height || 3000) / 1000;
    takeoff.columns.total_volume += w * d * h;
  });
  takeoff.columns.concrete_cum = +takeoff.columns.total_volume.toFixed(3);

  (elements?.beams || []).forEach(beam => {
    if (!beam?.start_point || !beam?.end_point) return;
    takeoff.beams.count++;
    const dx = beam.end_point.x - beam.start_point.x;
    const dy = beam.end_point.y - beam.start_point.y;
    const length = Math.sqrt(dx * dx + dy * dy) / 1000;
    const bW = (beam.width || 230) / 1000;
    const bH = (beam.depth || 400) / 1000;
    takeoff.beams.total_length += length;
    takeoff.beams.total_volume += length * bW * bH;
  });

  (elements?.doors || []).forEach(door => {
    takeoff.doors.count++;
    const type = door.door_type || 'single';
    takeoff.doors.by_type[type] = (takeoff.doors.by_type[type] || 0) + 1;
  });

  (elements?.windows || []).forEach(win => {
    takeoff.windows.count++;
    const type = win.window_type || 'casement';
    takeoff.windows.by_type[type] = (takeoff.windows.by_type[type] || 0) + 1;
  });

  takeoff.stairs.count = (elements?.stairs || []).length;

  (elements?.furniture || []).forEach(f => {
    takeoff.furniture.count++;
    const cat = f.category || 'other';
    takeoff.furniture.by_category[cat] = (takeoff.furniture.by_category[cat] || 0) + 1;
  });

  // Round
  takeoff.walls.total_length = +takeoff.walls.total_length.toFixed(2);
  takeoff.walls.total_area = +takeoff.walls.total_area.toFixed(2);
  takeoff.walls.total_volume = +takeoff.walls.total_volume.toFixed(3);
  takeoff.beams.total_length = +takeoff.beams.total_length.toFixed(2);
  takeoff.beams.total_volume = +takeoff.beams.total_volume.toFixed(3);
  takeoff.columns.total_volume = +takeoff.columns.total_volume.toFixed(3);

  return takeoff;
}

// ─── Natural Lighting Analysis ──────────────────────────────────
function analyzeLighting(rooms, windows, floorHeight = 3000) {
  const results = [];

  (rooms || []).forEach(room => {
    const roomArea = room.area || 0; // sqm
    if (roomArea <= 0) return;

    // Find windows in this room (by proximity / boundary)
    const roomWindows = (windows || []).filter(w => {
      if (!w?.position || !room?.boundary_points?.length) return false;
      return isPointInPolygon(w.position, room.boundary_points);
    });

    const totalWindowArea = roomWindows.reduce((sum, w) => {
      return sum + ((w.width || 1200) * (w.height || 1200)) / 1e6; // sqm
    }, 0);

    const ratio = roomArea > 0 ? totalWindowArea / roomArea : 0;
    const required = NBC_STANDARDS.natural_light.min_window_ratio;

    results.push({
      room_name: room.name || room.room_type || 'Room',
      room_area: +roomArea.toFixed(2),
      window_count: roomWindows.length,
      window_area: +totalWindowArea.toFixed(2),
      ratio: +ratio.toFixed(3),
      required_ratio: required,
      compliant: ratio >= required,
      recommendation: ratio < required
        ? `Add ${Math.ceil((required * roomArea - totalWindowArea) / 1.44)} more standard windows`
        : 'Adequate natural lighting',
    });
  });

  return results;
}

// ─── Ventilation Analysis ───────────────────────────────────────
function analyzeVentilation(rooms, windows, floorHeight = 3000) {
  const results = [];

  (rooms || []).forEach(room => {
    const roomArea = room.area || 0;
    if (roomArea <= 0) return;

    const roomVolume = roomArea * (floorHeight / 1000);
    const roomType = room.room_type || 'general';
    const requiredRatio = NBC_STANDARDS.ventilation[`min_${roomType}_opening`]
      || NBC_STANDARDS.ventilation.min_opening_ratio;

    const roomWindows = (windows || []).filter(w => {
      if (!w?.position || !room?.boundary_points?.length) return false;
      return isPointInPolygon(w.position, room.boundary_points);
    });

    const totalOpeningArea = roomWindows.reduce((sum, w) => {
      const factor = w.window_type === 'fixed' ? 0 : (w.window_type === 'casement' ? 0.9 : 0.5);
      return sum + ((w.width || 1200) * (w.height || 1200)) / 1e6 * factor;
    }, 0);

    const ratio = roomArea > 0 ? totalOpeningArea / roomArea : 0;

    results.push({
      room_name: room.name || room.room_type || 'Room',
      room_type: roomType,
      room_area: +roomArea.toFixed(2),
      room_volume: +roomVolume.toFixed(2),
      opening_area: +totalOpeningArea.toFixed(2),
      ratio: +ratio.toFixed(3),
      required_ratio: requiredRatio,
      compliant: ratio >= requiredRatio,
    });
  });

  return results;
}

// ─── Space Optimization ─────────────────────────────────────────
function analyzeSpaceOptimization(rooms) {
  const results = [];

  (rooms || []).forEach(room => {
    const area = room.area || 0;
    const type = room.room_type || 'general';
    const minArea = NBC_STANDARDS.min_carpet_area[type] || 0;

    results.push({
      room_name: room.name || room.room_type || 'Room',
      room_type: type,
      area: +area.toFixed(2),
      min_area: minArea,
      compliant: minArea === 0 || area >= minArea,
      deficit: minArea > area ? +(minArea - area).toFixed(2) : 0,
    });
  });

  return results;
}

// ─── Point in Polygon ───────────────────────────────────────────
function isPointInPolygon(point, polygon) {
  if (!point || !polygon || polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

module.exports = {
  generateQuantityTakeoff,
  analyzeLighting,
  analyzeVentilation,
  analyzeSpaceOptimization,
  isPointInPolygon,
  NBC_STANDARDS,
};
