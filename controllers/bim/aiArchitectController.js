const BIMProject = require('../../models/bim/BIMProject');
const BIMBuilding = require('../../models/bim/Building');
const BIMFloor = require('../../models/bim/Floor');
const BIMWall = require('../../models/bim/Wall');
const BIMDoor = require('../../models/bim/Door');
const BIMWindow = require('../../models/bim/Window');
const BIMRoom = require('../../models/bim/Room');
const Project = require('../../models/Project');
const { createNotification } = require('../../services/notificationService');

// ═══════════════════════════════════════════════════════════════
// ROOM STANDARDS — Indian residential typical sizes (sqft)
// ═══════════════════════════════════════════════════════════════
const ROOM_STANDARDS = {
  '1BHK': [
    { name: 'Living Room', minArea: 120, maxArea: 180, ratio: 0.32, type: 'living', zone: 'NE', adjacency: ['Kitchen', 'Balcony', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Bedroom 1', minArea: 100, maxArea: 160, ratio: 0.28, type: 'bedroom', zone: 'SW', adjacency: ['Bathroom 1', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Kitchen', minArea: 55, maxArea: 90, ratio: 0.14, type: 'kitchen', zone: 'SE', adjacency: ['Living Room', 'Utility'], minW: 2100, minD: 2400 },
    { name: 'Bathroom 1', minArea: 30, maxArea: 45, ratio: 0.08, type: 'bathroom', zone: 'NW', adjacency: ['Bedroom 1'], minW: 1500, minD: 1800 },
    { name: 'Balcony', minArea: 25, maxArea: 45, ratio: 0.06, type: 'balcony', zone: 'N', adjacency: ['Living Room'], minW: 1200, minD: 1200 },
    { name: 'Passage', minArea: 20, maxArea: 35, ratio: 0.06, type: 'passage', zone: 'C', adjacency: ['Living Room', 'Bedroom 1'], minW: 1050, minD: 1200 },
    { name: 'Utility', minArea: 15, maxArea: 25, ratio: 0.04, type: 'utility', zone: 'NW', adjacency: ['Kitchen'], minW: 1200, minD: 1200 },
  ],
  '2BHK': [
    { name: 'Living + Dining', minArea: 160, maxArea: 240, ratio: 0.27, type: 'living', zone: 'NE', adjacency: ['Kitchen', 'Balcony', 'Passage'], minW: 3600, minD: 3600 },
    { name: 'Master Bedroom', minArea: 130, maxArea: 180, ratio: 0.20, type: 'bedroom', zone: 'SW', adjacency: ['Master Bath', 'Passage'], minW: 3300, minD: 3300 },
    { name: 'Bedroom 2', minArea: 100, maxArea: 155, ratio: 0.16, type: 'bedroom', zone: 'W', adjacency: ['Common Bath', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Kitchen', minArea: 70, maxArea: 105, ratio: 0.11, type: 'kitchen', zone: 'SE', adjacency: ['Living + Dining', 'Utility'], minW: 2400, minD: 2700 },
    { name: 'Master Bath', minArea: 35, maxArea: 50, ratio: 0.06, type: 'bathroom', zone: 'NW', adjacency: ['Master Bedroom'], minW: 1500, minD: 1800 },
    { name: 'Common Bath', minArea: 25, maxArea: 40, ratio: 0.05, type: 'bathroom', zone: 'W', adjacency: ['Bedroom 2', 'Passage'], minW: 1500, minD: 1500 },
    { name: 'Balcony', minArea: 30, maxArea: 55, ratio: 0.05, type: 'balcony', zone: 'N', adjacency: ['Living + Dining'], minW: 1200, minD: 1200 },
    { name: 'Passage', minArea: 25, maxArea: 40, ratio: 0.05, type: 'passage', zone: 'C', adjacency: ['Living + Dining', 'Master Bedroom', 'Bedroom 2'], minW: 1050, minD: 1200 },
    { name: 'Utility', minArea: 15, maxArea: 25, ratio: 0.03, type: 'utility', zone: 'NW', adjacency: ['Kitchen'], minW: 1200, minD: 1200 },
  ],
  '3BHK': [
    { name: 'Living + Dining', minArea: 200, maxArea: 320, ratio: 0.24, type: 'living', zone: 'NE', adjacency: ['Kitchen', 'Balcony 1', 'Passage'], minW: 4000, minD: 3600 },
    { name: 'Master Bedroom', minArea: 155, maxArea: 225, ratio: 0.17, type: 'bedroom', zone: 'SW', adjacency: ['Master Bath', 'Balcony 2', 'Passage'], minW: 3600, minD: 3600 },
    { name: 'Bedroom 2', minArea: 120, maxArea: 175, ratio: 0.13, type: 'bedroom', zone: 'W', adjacency: ['Common Bath', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Bedroom 3', minArea: 100, maxArea: 155, ratio: 0.11, type: 'bedroom', zone: 'NW', adjacency: ['Common Bath', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Kitchen', minArea: 80, maxArea: 125, ratio: 0.10, type: 'kitchen', zone: 'SE', adjacency: ['Living + Dining', 'Utility'], minW: 2700, minD: 2700 },
    { name: 'Master Bath', minArea: 40, maxArea: 60, ratio: 0.05, type: 'bathroom', zone: 'SW', adjacency: ['Master Bedroom'], minW: 1500, minD: 1800 },
    { name: 'Common Bath', minArea: 30, maxArea: 45, ratio: 0.04, type: 'bathroom', zone: 'NW', adjacency: ['Bedroom 2', 'Bedroom 3', 'Passage'], minW: 1500, minD: 1500 },
    { name: 'Balcony 1', minArea: 30, maxArea: 50, ratio: 0.04, type: 'balcony', zone: 'N', adjacency: ['Living + Dining'], minW: 1200, minD: 1200 },
    { name: 'Balcony 2', minArea: 25, maxArea: 40, ratio: 0.03, type: 'balcony', zone: 'S', adjacency: ['Master Bedroom'], minW: 1200, minD: 1200 },
    { name: 'Passage', minArea: 30, maxArea: 50, ratio: 0.04, type: 'passage', zone: 'C', adjacency: ['Living + Dining', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3'], minW: 1050, minD: 1200 },
    { name: 'Utility', minArea: 18, maxArea: 30, ratio: 0.03, type: 'utility', zone: 'NW', adjacency: ['Kitchen'], minW: 1200, minD: 1200 },
  ],
  '4BHK': [
    { name: 'Living + Dining', minArea: 280, maxArea: 400, ratio: 0.21, type: 'living', zone: 'NE', adjacency: ['Kitchen', 'Balcony', 'Passage'], minW: 4500, minD: 4000 },
    { name: 'Master Bedroom', minArea: 180, maxArea: 260, ratio: 0.14, type: 'bedroom', zone: 'SW', adjacency: ['Master Bath', 'Passage'], minW: 3600, minD: 3600 },
    { name: 'Bedroom 2', minArea: 140, maxArea: 200, ratio: 0.11, type: 'bedroom', zone: 'W', adjacency: ['Bath 2', 'Passage'], minW: 3300, minD: 3300 },
    { name: 'Bedroom 3', minArea: 120, maxArea: 180, ratio: 0.10, type: 'bedroom', zone: 'NW', adjacency: ['Bath 3', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Bedroom 4', minArea: 100, maxArea: 160, ratio: 0.08, type: 'bedroom', zone: 'N', adjacency: ['Bath 3', 'Passage'], minW: 3000, minD: 3000 },
    { name: 'Kitchen', minArea: 100, maxArea: 140, ratio: 0.07, type: 'kitchen', zone: 'SE', adjacency: ['Living + Dining', 'Utility'], minW: 2700, minD: 3000 },
    { name: 'Master Bath', minArea: 50, maxArea: 70, ratio: 0.04, type: 'bathroom', zone: 'SW', adjacency: ['Master Bedroom'], minW: 1800, minD: 2100 },
    { name: 'Bath 2', minArea: 35, maxArea: 50, ratio: 0.03, type: 'bathroom', zone: 'W', adjacency: ['Bedroom 2'], minW: 1500, minD: 1800 },
    { name: 'Bath 3', minArea: 30, maxArea: 45, ratio: 0.03, type: 'bathroom', zone: 'NW', adjacency: ['Bedroom 3', 'Bedroom 4'], minW: 1500, minD: 1500 },
    { name: 'Study', minArea: 60, maxArea: 100, ratio: 0.05, type: 'study', zone: 'W', adjacency: ['Passage'], minW: 2400, minD: 2400 },
    { name: 'Balcony', minArea: 40, maxArea: 60, ratio: 0.04, type: 'balcony', zone: 'N', adjacency: ['Living + Dining'], minW: 1200, minD: 1200 },
    { name: 'Passage', minArea: 35, maxArea: 55, ratio: 0.04, type: 'passage', zone: 'C', adjacency: ['Living + Dining', 'Master Bedroom', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4'], minW: 1050, minD: 1200 },
    { name: 'Utility', minArea: 25, maxArea: 40, ratio: 0.03, type: 'utility', zone: 'NW', adjacency: ['Kitchen'], minW: 1200, minD: 1200 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// VASTU RULES — Directional preferences
// ═══════════════════════════════════════════════════════════════
const VASTU_RULES = {
  'Living Room': { preferred: ['NE', 'N', 'E'], avoid: ['SW'] },
  'Living + Dining': { preferred: ['NE', 'N', 'E'], avoid: ['SW'] },
  'Master Bedroom': { preferred: ['SW', 'S'], avoid: ['NE'] },
  'Bedroom 1': { preferred: ['S', 'SW', 'W'], avoid: ['NE'] },
  'Bedroom 2': { preferred: ['S', 'W', 'NW'], avoid: ['SE'] },
  'Bedroom 3': { preferred: ['W', 'NW'], avoid: ['SE'] },
  'Bedroom 4': { preferred: ['W', 'N'], avoid: ['SE'] },
  'Kitchen': { preferred: ['SE'], avoid: ['NE'] },
  'Bathroom 1': { preferred: ['W', 'NW'], avoid: ['NE', 'SW'] },
  'Master Bath': { preferred: ['W', 'NW', 'SW'], avoid: ['NE'] },
  'Common Bath': { preferred: ['W', 'NW'], avoid: ['NE'] },
  'Bath 2': { preferred: ['W', 'NW'], avoid: ['NE'] },
  'Bath 3': { preferred: ['W'], avoid: ['NE'] },
  'Balcony': { preferred: ['N', 'E', 'NE'], avoid: ['SW'] },
  'Balcony 1': { preferred: ['N', 'E'], avoid: ['SW'] },
  'Balcony 2': { preferred: ['S', 'E'], avoid: ['NW'] },
  'Study': { preferred: ['W', 'N', 'NW'], avoid: ['SE'] },
  'Pooja Room': { preferred: ['NE'], avoid: ['S', 'SW'] },
  'Passage': { preferred: ['C'], avoid: [] },
  'Utility': { preferred: ['NW', 'W'], avoid: ['NE'] },
  'Servant Room': { preferred: ['NW', 'SE'], avoid: ['NE', 'SW'] },
  'Staircase': { preferred: ['SW', 'S', 'W'], avoid: ['NE', 'C'] },
};

// ═══════════════════════════════════════════════════════════════
// VASTU ZONE MAPPING — based on facing direction
// Maps compass zones to plot quadrants (x,y fractions)
// ═══════════════════════════════════════════════════════════════
function getVastuZoneRect(zone, plotW, plotD, facing) {
  // The Vastu grid is absolute (NE is always top-right on compass).
  // We rotate the grid based on facing so the entrance aligns correctly.
  // For simplicity: plot Y=0 is the entrance side (road-facing).
  
  const zoneMap = {
    'NE': { xf: 0.67, yf: 0.0,  wf: 0.33, df: 0.33 },
    'N':  { xf: 0.33, yf: 0.0,  wf: 0.34, df: 0.33 },
    'NW': { xf: 0.0,  yf: 0.0,  wf: 0.33, df: 0.33 },
    'E':  { xf: 0.67, yf: 0.33, wf: 0.33, df: 0.34 },
    'C':  { xf: 0.33, yf: 0.33, wf: 0.34, df: 0.34 },
    'W':  { xf: 0.0,  yf: 0.33, wf: 0.33, df: 0.34 },
    'SE': { xf: 0.67, yf: 0.67, wf: 0.33, df: 0.33 },
    'S':  { xf: 0.33, yf: 0.67, wf: 0.34, df: 0.33 },
    'SW': { xf: 0.0,  yf: 0.67, wf: 0.33, df: 0.33 },
  };

  // Rotate zones based on facing direction
  const rotations = {
    'North': ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'],
    'South': ['SE', 'S', 'SW', 'E', 'C', 'W', 'NE', 'N', 'NW'],
    'East':  ['NE', 'E', 'SE', 'N', 'C', 'S', 'NW', 'W', 'SW'],
    'West':  ['SW', 'W', 'NW', 'S', 'C', 'N', 'SE', 'E', 'NE'],
    'North-East': ['N', 'NE', 'E', 'NW', 'C', 'SE', 'W', 'SW', 'S'],
    'North-West': ['W', 'NW', 'N', 'SW', 'C', 'NE', 'S', 'SE', 'E'],
    'South-East': ['E', 'SE', 'S', 'NE', 'C', 'SW', 'N', 'NW', 'W'],
    'South-West': ['S', 'SW', 'W', 'SE', 'C', 'NW', 'E', 'NE', 'N'],
  };

  const order = ['NW', 'N', 'NE', 'W', 'C', 'E', 'SW', 'S', 'SE'];
  const rotation = rotations[facing] || rotations['North'];
  const idx = order.indexOf(zone);
  const mappedZone = idx >= 0 ? rotation[idx] : zone;
  const rect = zoneMap[mappedZone] || zoneMap['C'];

  return {
    x: rect.xf * plotW,
    y: rect.yf * plotD,
    w: rect.wf * plotW,
    d: rect.df * plotD,
  };
}

// ═══════════════════════════════════════════════════════════════
// PROFESSIONAL LAYOUT ENGINE — Zone-based space planning
// ═══════════════════════════════════════════════════════════════
function generateProfessionalLayout(rooms, plotW, plotD, wallT, facing, vastuCompliant) {
  const margin = wallT;
  const usableW = plotW - 2 * margin;
  const usableD = plotD - 2 * margin;
  const totalAreaMM2 = rooms.reduce((s, r) => s + r.area * 92903, 0);

  // Sort rooms: large first (living, bedrooms), then small (baths, utility)
  const sortedRooms = [...rooms].sort((a, b) => b.area - a.area);
  
  const layout = [];
  const placed = new Set();

  // Phase 1: Place rooms into Vastu zones
  for (const room of sortedRooms) {
    if (placed.has(room.name)) continue;

    const zone = vastuCompliant ? (room.zone || 'C') : 'C';
    const zoneRect = getVastuZoneRect(zone, usableW, usableD, facing);

    const areaMM2 = room.area * 92903;
    // Calculate dimensions maintaining aspect ratio 1:1 to 1:1.6
    let roomW = Math.max(room.minW || 2400, Math.round(Math.sqrt(areaMM2 * 1.2)));
    let roomD = Math.round(areaMM2 / roomW);
    roomD = Math.max(room.minD || 2400, roomD);

    // Constrain to zone
    roomW = Math.min(roomW, zoneRect.w - wallT);
    roomD = Math.min(roomD, zoneRect.d - wallT);

    // Position within zone
    let px = margin + zoneRect.x;
    let py = margin + zoneRect.y;

    // Avoid overlaps — nudge until clear
    let attempts = 0;
    while (attempts < 20 && hasOverlap(px, py, roomW, roomD, layout, wallT)) {
      px += wallT + 100;
      if (px + roomW > margin + usableW) {
        px = margin;
        py += wallT + 100;
      }
      if (py + roomD > margin + usableD) {
        roomD = Math.max(room.minD || 1500, margin + usableD - py);
        break;
      }
      attempts++;
    }

    // Final constraint check
    if (px + roomW > margin + usableW) roomW = margin + usableW - px;
    if (py + roomD > margin + usableD) roomD = margin + usableD - py;
    roomW = Math.max(1200, roomW);
    roomD = Math.max(1200, roomD);

    layout.push({
      name: room.name,
      type: room.type || guessRoomType(room.name),
      area_sqft: room.area,
      x: Math.round(px),
      y: Math.round(py),
      width: Math.round(roomW),
      depth: Math.round(roomD),
      zone: zone,
      actual_area_sqft: Math.round((roomW * roomD) / 92903),
    });

    placed.add(room.name);
  }

  // Phase 2: Snap adjacent rooms to share walls
  snapAdjacentRooms(layout, rooms, wallT);

  return layout;
}

function hasOverlap(x, y, w, d, layout, wallT) {
  for (const r of layout) {
    if (x < r.x + r.width + wallT && x + w + wallT > r.x &&
        y < r.y + r.depth + wallT && y + d + wallT > r.y) {
      return true;
    }
  }
  return false;
}

function snapAdjacentRooms(layout, roomDefs, wallT) {
  // For each room, find its defined adjacencies and try to align edges
  const roomMap = {};
  roomDefs.forEach(r => { roomMap[r.name] = r; });

  for (const room of layout) {
    const def = roomMap[room.name];
    if (!def?.adjacency) continue;

    for (const adjName of def.adjacency) {
      const adj = layout.find(l => l.name === adjName);
      if (!adj) continue;

      // If rooms are nearby, snap them together
      const xGap = Math.abs((room.x + room.width) - adj.x);
      const yGap = Math.abs((room.y + room.depth) - adj.y);
      const xGapR = Math.abs((adj.x + adj.width) - room.x);
      const yGapR = Math.abs((adj.y + adj.depth) - room.y);

      // Snap horizontally
      if (xGap < wallT * 3 && rangesOverlap(room.y, room.y + room.depth, adj.y, adj.y + adj.depth)) {
        adj.x = room.x + room.width + wallT;
      } else if (xGapR < wallT * 3 && rangesOverlap(room.y, room.y + room.depth, adj.y, adj.y + adj.depth)) {
        adj.x = room.x - adj.width - wallT;
      }
      // Snap vertically
      if (yGap < wallT * 3 && rangesOverlap(room.x, room.x + room.width, adj.x, adj.x + adj.width)) {
        adj.y = room.y + room.depth + wallT;
      } else if (yGapR < wallT * 3 && rangesOverlap(room.x, room.x + room.width, adj.x, adj.x + adj.width)) {
        adj.y = room.y - adj.depth - wallT;
      }
    }
  }
}

function rangesOverlap(a1, a2, b1, b2) {
  return a1 < b2 && a2 > b1;
}

// ═══════════════════════════════════════════════════════════════
// SHARED-WALL ARCHITECTURE — Deduplicated walls
// ═══════════════════════════════════════════════════════════════
function generateSharedWalls(rooms, wallT, plotW, plotD) {
  const walls = [];
  const wallSet = new Set(); // "x1,y1-x2,y2" to deduplicate
  let id = 1;
  const margin = wallT;

  // Step 1: Collect all wall segments from all rooms
  const allSegs = [];
  for (const room of rooms) {
    // Top wall
    allSegs.push({ x1: room.x, y1: room.y, x2: room.x + room.width, y2: room.y, room: room.name });
    // Right wall
    allSegs.push({ x1: room.x + room.width, y1: room.y, x2: room.x + room.width, y2: room.y + room.depth, room: room.name });
    // Bottom wall
    allSegs.push({ x1: room.x + room.width, y1: room.y + room.depth, x2: room.x, y2: room.y + room.depth, room: room.name });
    // Left wall
    allSegs.push({ x1: room.x, y1: room.y + room.depth, x2: room.x, y2: room.y, room: room.name });
  }

  // Step 2: Deduplicate (merge walls that are very close and parallel)
  const used = new Array(allSegs.length).fill(false);

  for (let i = 0; i < allSegs.length; i++) {
    if (used[i]) continue;
    const seg = allSegs[i];

    // Check if this segment is shared (another room has a nearly identical wall)
    let isShared = false;
    for (let j = i + 1; j < allSegs.length; j++) {
      if (used[j]) continue;
      const other = allSegs[j];
      if (areWallsShared(seg, other, wallT)) {
        used[j] = true;
        isShared = true;
      }
    }

    // Determine if exterior wall (touching plot boundary)
    const isExterior = isOnPlotBoundary(seg, margin, plotW - margin, plotD - margin, wallT);

    const key = `${Math.round(seg.x1)},${Math.round(seg.y1)}-${Math.round(seg.x2)},${Math.round(seg.y2)}`;
    if (!wallSet.has(key)) {
      wallSet.add(key);
      walls.push({
        canvas_id: `ai_wall_${id++}`,
        start_point: { x: Math.round(seg.x1), y: Math.round(seg.y1) },
        end_point: { x: Math.round(seg.x2), y: Math.round(seg.y2) },
        thickness: isExterior ? wallT : Math.round(wallT * 0.65), // Interior walls are thinner (150mm)
        wall_type: isExterior ? 'exterior' : 'interior',
        height: 3000,
      });
    }
    used[i] = true;
  }

  // Step 3: Add outer boundary walls if missing
  addBoundaryWalls(walls, rooms, wallT, plotW, plotD, id);

  return walls;
}

function areWallsShared(a, b, tolerance) {
  // Two wall segments are shared if they overlap and are close (within wall thickness)
  const isHorizA = Math.abs(a.y1 - a.y2) < 10;
  const isHorizB = Math.abs(b.y1 - b.y2) < 10;
  const isVertA = Math.abs(a.x1 - a.x2) < 10;
  const isVertB = Math.abs(b.x1 - b.x2) < 10;

  if (isHorizA && isHorizB) {
    if (Math.abs(a.y1 - b.y1) < tolerance * 2) {
      const aMin = Math.min(a.x1, a.x2), aMax = Math.max(a.x1, a.x2);
      const bMin = Math.min(b.x1, b.x2), bMax = Math.max(b.x1, b.x2);
      return aMin < bMax && aMax > bMin;
    }
  }
  if (isVertA && isVertB) {
    if (Math.abs(a.x1 - b.x1) < tolerance * 2) {
      const aMin = Math.min(a.y1, a.y2), aMax = Math.max(a.y1, a.y2);
      const bMin = Math.min(b.y1, b.y2), bMax = Math.max(b.y1, b.y2);
      return aMin < bMax && aMax > bMin;
    }
  }
  return false;
}

function isOnPlotBoundary(seg, minX, maxX, minY, maxY, tol) {
  const isHoriz = Math.abs(seg.y1 - seg.y2) < 10;
  const isVert = Math.abs(seg.x1 - seg.x2) < 10;
  if (isHoriz) return Math.abs(seg.y1 - minY) < tol * 2 || Math.abs(seg.y1 - maxY) < tol * 2;
  if (isVert) return Math.abs(seg.x1 - minX) < tol * 2 || Math.abs(seg.x1 - maxX) < tol * 2;
  return false;
}

function addBoundaryWalls(walls, rooms, wallT, plotW, plotD, startId) {
  const margin = wallT;
  const plotBounds = [
    { start_point: { x: margin, y: margin }, end_point: { x: plotW - margin, y: margin } },
    { start_point: { x: plotW - margin, y: margin }, end_point: { x: plotW - margin, y: plotD - margin } },
    { start_point: { x: plotW - margin, y: plotD - margin }, end_point: { x: margin, y: plotD - margin } },
    { start_point: { x: margin, y: plotD - margin }, end_point: { x: margin, y: margin } },
  ];

  let id = startId;
  for (const bound of plotBounds) {
    const exists = walls.some(w =>
      Math.abs(w.start_point.x - bound.start_point.x) < wallT * 2 &&
      Math.abs(w.start_point.y - bound.start_point.y) < wallT * 2 &&
      Math.abs(w.end_point.x - bound.end_point.x) < wallT * 2 &&
      Math.abs(w.end_point.y - bound.end_point.y) < wallT * 2
    );
    if (!exists) {
      walls.push({
        canvas_id: `ai_wall_${id++}`,
        start_point: bound.start_point,
        end_point: bound.end_point,
        thickness: wallT,
        wall_type: 'exterior',
        height: 3000,
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SMART DOOR PLACEMENT — Adjacency-aware
// ═══════════════════════════════════════════════════════════════
function generateSmartDoors(rooms, roomDefs, wallT, facing) {
  const doors = [];
  let id = 1;
  const roomMap = {};
  roomDefs.forEach(r => { roomMap[r.name] = r; });

  for (const room of rooms) {
    const def = roomMap[room.name];
    const isBathroom = room.type === 'bathroom';
    const isMain = room.name.includes('Living') || room.name.includes('Dining');
    const doorWidth = isMain ? 1050 : isBathroom ? 750 : 900;
    const doorHeight = 2100;

    // Find the best wall to place the door on
    // Priority: shared wall with adjacent room > wall facing passage > any wall
    let doorX, doorY, doorRotation = 0, swingDir = 'left';

    const adjNames = def?.adjacency || [];
    let placed = false;

    // Try placing on shared wall with first adjacent room
    for (const adjName of adjNames) {
      const adj = rooms.find(r => r.name === adjName);
      if (!adj || placed) continue;

      const sharedWall = findSharedWall(room, adj, wallT);
      if (sharedWall) {
        doorX = sharedWall.doorX;
        doorY = sharedWall.doorY;
        doorRotation = sharedWall.rotation;
        placed = true;
        break;
      }
    }

    // Fallback: place on the wall closest to building center
    if (!placed) {
      doorX = room.x + room.width / 2 - doorWidth / 2;
      doorY = room.y;
      doorRotation = 0;
    }

    // Bathroom doors swing outward
    if (isBathroom) swingDir = 'out';

    doors.push({
      canvas_id: `ai_door_${id++}`,
      position: { x: Math.round(doorX), y: Math.round(doorY) },
      width: doorWidth,
      height: doorHeight,
      door_type: isMain ? 'double' : 'single',
      swing: swingDir,
      rotation: doorRotation,
      room_name: room.name,
    });
  }

  // Add main entrance door
  const entranceSide = facing.includes('North') ? 'top' : facing.includes('South') ? 'bottom' : facing.includes('East') ? 'right' : 'left';
  const buildingCx = rooms.reduce((s, r) => s + r.x + r.width / 2, 0) / rooms.length;
  const buildingCy = rooms.reduce((s, r) => s + r.y + r.depth / 2, 0) / rooms.length;

  let mainDoorX, mainDoorY, mainDoorRot = 0;
  if (entranceSide === 'top') { mainDoorX = buildingCx - 525; mainDoorY = Math.min(...rooms.map(r => r.y)); }
  else if (entranceSide === 'bottom') { mainDoorX = buildingCx - 525; mainDoorY = Math.max(...rooms.map(r => r.y + r.depth)); }
  else if (entranceSide === 'left') { mainDoorX = Math.min(...rooms.map(r => r.x)); mainDoorY = buildingCy - 525; mainDoorRot = 90; }
  else { mainDoorX = Math.max(...rooms.map(r => r.x + r.width)); mainDoorY = buildingCy - 525; mainDoorRot = 90; }

  doors.unshift({
    canvas_id: `ai_door_main`,
    position: { x: Math.round(mainDoorX), y: Math.round(mainDoorY) },
    width: 1200,
    height: 2100,
    door_type: 'main',
    swing: 'both',
    rotation: mainDoorRot,
    room_name: 'Main Entrance',
  });

  return doors;
}

function findSharedWall(roomA, roomB, wallT) {
  const tolerance = wallT * 3;

  // Check if rooms share a horizontal boundary
  if (Math.abs(roomA.y + roomA.depth - roomB.y) < tolerance &&
      rangesOverlap(roomA.x, roomA.x + roomA.width, roomB.x, roomB.x + roomB.width)) {
    const overlapStart = Math.max(roomA.x, roomB.x);
    const overlapEnd = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    return { doorX: (overlapStart + overlapEnd) / 2 - 450, doorY: roomA.y + roomA.depth, rotation: 0 };
  }
  if (Math.abs(roomB.y + roomB.depth - roomA.y) < tolerance &&
      rangesOverlap(roomA.x, roomA.x + roomA.width, roomB.x, roomB.x + roomB.width)) {
    const overlapStart = Math.max(roomA.x, roomB.x);
    const overlapEnd = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    return { doorX: (overlapStart + overlapEnd) / 2 - 450, doorY: roomA.y, rotation: 0 };
  }

  // Check if rooms share a vertical boundary
  if (Math.abs(roomA.x + roomA.width - roomB.x) < tolerance &&
      rangesOverlap(roomA.y, roomA.y + roomA.depth, roomB.y, roomB.y + roomB.depth)) {
    const overlapStart = Math.max(roomA.y, roomB.y);
    const overlapEnd = Math.min(roomA.y + roomA.depth, roomB.y + roomB.depth);
    return { doorX: roomA.x + roomA.width, doorY: (overlapStart + overlapEnd) / 2 - 450, rotation: 90 };
  }
  if (Math.abs(roomB.x + roomB.width - roomA.x) < tolerance &&
      rangesOverlap(roomA.y, roomA.y + roomA.depth, roomB.y, roomB.y + roomB.depth)) {
    const overlapStart = Math.max(roomA.y, roomB.y);
    const overlapEnd = Math.min(roomA.y + roomA.depth, roomB.y + roomB.depth);
    return { doorX: roomA.x, doorY: (overlapStart + overlapEnd) / 2 - 450, rotation: 90 };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// ORIENTATION-BASED WINDOWS
// ═══════════════════════════════════════════════════════════════
function generateSmartWindows(rooms, wallT, plotW, plotD) {
  const windows = [];
  let id = 1;
  const margin = wallT;
  const plotMinX = margin, plotMaxX = plotW - margin;
  const plotMinY = margin, plotMaxY = plotD - margin;

  for (const room of rooms) {
    const needsWindow = ['bedroom', 'living', 'kitchen', 'study'].includes(room.type) ||
      room.name.includes('Living') || room.name.includes('Dining') || room.name.includes('Bedroom') ||
      room.name.includes('Master') || room.name.includes('Study');
    const needsVent = room.type === 'bathroom';

    if (!needsWindow && !needsVent) continue;

    const winW = needsVent ? 600 :
      (room.name.includes('Living') || room.name.includes('Dining') ? 1800 : 1200);
    const winH = needsVent ? 600 : 1200;
    const sillH = needsVent ? 1800 : 900;

    // Find exterior walls of this room
    const exteriorWalls = [];
    if (Math.abs(room.x - plotMinX) < wallT * 2) exteriorWalls.push('left');
    if (Math.abs(room.x + room.width - plotMaxX) < wallT * 2) exteriorWalls.push('right');
    if (Math.abs(room.y - plotMinY) < wallT * 2) exteriorWalls.push('top');
    if (Math.abs(room.y + room.depth - plotMaxY) < wallT * 2) exteriorWalls.push('bottom');

    // Place window on first available exterior wall
    for (const wall of exteriorWalls) {
      let wx, wy, wrot = 0;
      if (wall === 'left') {
        wx = room.x; wy = room.y + room.depth / 2; wrot = 90;
      } else if (wall === 'right') {
        wx = room.x + room.width; wy = room.y + room.depth / 2; wrot = 90;
      } else if (wall === 'top') {
        wx = room.x + room.width / 2; wy = room.y; wrot = 0;
      } else {
        wx = room.x + room.width / 2; wy = room.y + room.depth; wrot = 0;
      }

      windows.push({
        canvas_id: `ai_win_${id++}`,
        position: { x: Math.round(wx), y: Math.round(wy) },
        width: winW,
        height: winH,
        sill_height: sillH,
        window_type: needsVent ? 'ventilator' : (winW >= 1800 ? 'sliding' : 'casement'),
        rotation: wrot,
        room_name: room.name,
        wall_side: wall,
      });

      // For cross-ventilation in bedrooms: add second window if possible
      if (room.type === 'bedroom' && exteriorWalls.length >= 2 && wall === exteriorWalls[0]) {
        continue; // Will place on next wall
      } else {
        break;
      }
    }

    // If no exterior wall, skip window (interior room)
  }

  return windows;
}

// ═══════════════════════════════════════════════════════════════
// FURNITURE LAYOUT GENERATOR
// ═══════════════════════════════════════════════════════════════
function generateFurnitureLayout(rooms) {
  const furniture = [];
  let id = 1;

  const FURNITURE_BY_TYPE = {
    living: [
      { type: 'sofa', offsetX: 0.5, offsetY: 0.65, w: 2000, d: 850, rotation: 0 },
      { type: 'coffee_table', offsetX: 0.5, offsetY: 0.45, w: 900, d: 500, rotation: 0 },
      { type: 'tv_unit', offsetX: 0.5, offsetY: 0.1, w: 1600, d: 400, rotation: 0 },
    ],
    bedroom: [
      { type: 'bed', offsetX: 0.5, offsetY: 0.55, w: 1800, d: 2000, rotation: 0 },
      { type: 'wardrobe', offsetX: 0.1, offsetY: 0.15, w: 1800, d: 600, rotation: 0 },
      { type: 'study_table', offsetX: 0.85, offsetY: 0.85, w: 1200, d: 600, rotation: 0 },
    ],
    kitchen: [
      { type: 'kitchen_cabinets', offsetX: 0.5, offsetY: 0.1, w: 2700, d: 600, rotation: 0 },
      { type: 'refrigerator', offsetX: 0.9, offsetY: 0.1, w: 650, d: 650, rotation: 0 },
    ],
    bathroom: [
      { type: 'toilet', offsetX: 0.3, offsetY: 0.7, w: 380, d: 600, rotation: 0 },
      { type: 'wash_basin', offsetX: 0.7, offsetY: 0.15, w: 600, d: 450, rotation: 0 },
    ],
    study: [
      { type: 'study_table', offsetX: 0.5, offsetY: 0.3, w: 1200, d: 600, rotation: 0 },
      { type: 'bookshelf', offsetX: 0.1, offsetY: 0.5, w: 800, d: 300, rotation: 0 },
      { type: 'chair', offsetX: 0.5, offsetY: 0.55, w: 440, d: 440, rotation: 0 },
    ],
    balcony: [],
    passage: [],
    utility: [],
  };

  for (const room of rooms) {
    const furDefs = FURNITURE_BY_TYPE[room.type] || [];
    for (const f of furDefs) {
      const fx = room.x + room.width * f.offsetX;
      const fy = room.y + room.depth * f.offsetY;

      furniture.push({
        canvas_id: `ai_fur_${id++}`,
        type: f.type,
        furniture_type: f.type,
        position: { x: Math.round(fx), y: Math.round(fy) },
        width: f.w,
        depth: f.d,
        height: 750,
        rotation: f.rotation,
        room_name: room.name,
      });
    }
  }

  return furniture;
}

// ═══════════════════════════════════════════════════════════════
// STAIRCASE GENERATOR
// ═══════════════════════════════════════════════════════════════
function generateStaircase(rooms, plotW, plotD, wallT) {
  // Place staircase in Vastu-preferred position (SW or NW quadrant)
  const margin = wallT;
  const stairW = 1200;
  const stairD = 2700;
  const numRisers = 18;
  const riserHeight = 167;
  const treadDepth = 270;

  // Find an open spot near SW corner
  let sx = margin + 500;
  let sy = plotD - margin - stairD - 500;

  // Ensure no overlap with rooms
  let attempts = 0;
  while (attempts < 10 && hasOverlap(sx, sy, stairW, stairD, rooms, wallT)) {
    sx += stairW + wallT;
    if (sx + stairW > plotW - margin) {
      sx = margin + 500;
      sy -= stairD + wallT;
    }
    attempts++;
  }

  return [{
    canvas_id: 'ai_stair_1',
    position: { x: Math.round(sx), y: Math.round(sy) },
    width: stairW,
    depth: stairD,
    num_risers: numRisers,
    riser_height: riserHeight,
    tread_depth: treadDepth,
    direction: 'up',
    rotation: 0,
  }];
}

// ═══════════════════════════════════════════════════════════════
// COLUMN GRID GENERATOR
// ═══════════════════════════════════════════════════════════════
function generateColumnGrid(rooms, wallT, plotW, plotD) {
  const columns = [];
  let id = 1;
  const colSize = 300; // 300x300mm columns
  const margin = wallT;

  // Place columns at wall intersections and building corners
  const xCoords = new Set();
  const yCoords = new Set();

  // Collect all unique x and y coordinates from room boundaries
  xCoords.add(margin); xCoords.add(plotW - margin);
  yCoords.add(margin); yCoords.add(plotD - margin);

  for (const room of rooms) {
    xCoords.add(room.x);
    xCoords.add(room.x + room.width);
    yCoords.add(room.y);
    yCoords.add(room.y + room.depth);
  }

  const xs = [...xCoords].sort((a, b) => a - b);
  const ys = [...yCoords].sort((a, b) => a - b);

  // Place columns at corner intersections only (not every intersection)
  // Use exterior boundary + major internal intersections
  for (const x of xs) {
    for (const y of ys) {
      // Only at exterior boundary or major internal junctions
      const isExteriorX = Math.abs(x - margin) < wallT || Math.abs(x - (plotW - margin)) < wallT;
      const isExteriorY = Math.abs(y - margin) < wallT || Math.abs(y - (plotD - margin)) < wallT;
      const isCorner = isExteriorX || isExteriorY;

      // Also place at major internal wall intersections (where 3+ walls meet)
      let wallCount = 0;
      for (const room of rooms) {
        if (Math.abs(room.x - x) < wallT * 2 || Math.abs(room.x + room.width - x) < wallT * 2) {
          if (Math.abs(room.y - y) < wallT * 2 || Math.abs(room.y + room.depth - y) < wallT * 2) {
            wallCount++;
          }
        }
      }

      if (isCorner || wallCount >= 2) {
        columns.push({
          canvas_id: `ai_col_${id++}`,
          position: { x: Math.round(x), y: Math.round(y) },
          width: colSize,
          depth: colSize,
          height: 3000,
          column_type: 'RCC',
        });
      }
    }
  }

  return columns;
}

// ═══════════════════════════════════════════════════════════════
// DIMENSION GENERATOR
// ═══════════════════════════════════════════════════════════════
function generateDimensions(rooms, plotW, plotD, wallT) {
  const dims = [];
  const margin = wallT;

  // Overall plot dimensions
  dims.push({ type: 'overall', label: `${Math.round(plotW)}`, x1: margin, y1: plotD + 800, x2: plotW - margin, y2: plotD + 800, value_mm: plotW - 2 * margin });
  dims.push({ type: 'overall', label: `${Math.round(plotD)}`, x1: -800, y1: margin, x2: -800, y2: plotD - margin, value_mm: plotD - 2 * margin, vertical: true });

  // Room dimensions
  for (const room of rooms) {
    dims.push({ type: 'room_width', room: room.name, label: `${room.width}`, x1: room.x, y1: room.y + room.depth + 300, x2: room.x + room.width, y2: room.y + room.depth + 300, value_mm: room.width });
    dims.push({ type: 'room_depth', room: room.name, label: `${room.depth}`, x1: room.x - 300, y1: room.y, x2: room.x - 300, y2: room.y + room.depth, value_mm: room.depth, vertical: true });
  }

  return dims;
}

// ═══════════════════════════════════════════════════════════════
// VASTU ANALYSIS (enhanced)
// ═══════════════════════════════════════════════════════════════
function analyzeVastu(rooms, plotW, plotD, facing) {
  const analysis = { score: 0, total: 0, compliance: [], violations: [] };

  for (const room of rooms) {
    const roomCenterX = room.x + room.width / 2;
    const roomCenterY = room.y + room.depth / 2;
    const direction = getDirection(roomCenterX, roomCenterY, plotW, plotD);
    const rule = VASTU_RULES[room.name];

    analysis.total++;
    if (rule) {
      if (rule.preferred.includes(direction)) {
        analysis.score++;
        analysis.compliance.push({ room: room.name, direction, status: 'compliant', message: `${room.name} correctly placed in ${direction}` });
      } else if (rule.avoid.includes(direction)) {
        analysis.violations.push({ room: room.name, direction, severity: 'high', message: `${room.name} should NOT be in ${direction}. Preferred: ${rule.preferred.join(', ')}` });
      } else {
        analysis.score += 0.5;
        analysis.compliance.push({ room: room.name, direction, status: 'neutral', message: `${room.name} in ${direction} — acceptable` });
      }
    }
  }

  analysis.percentage = analysis.total > 0 ? Math.round((analysis.score / analysis.total) * 100) : 0;
  return analysis;
}

function getDirection(x, y, plotW, plotD) {
  const cx = plotW / 2, cy = plotD / 2;
  const nx = x < cx * 0.67 ? 'W' : x > cx * 1.33 ? 'E' : '';
  const ny = y < cy * 0.67 ? 'N' : y > cy * 1.33 ? 'S' : '';
  if (nx && ny) return `${ny}${nx}`;
  if (nx) return nx;
  if (ny) return ny;
  return 'C';
}

// ═══════════════════════════════════════════════════════════════
// DESIGN SUGGESTIONS
// ═══════════════════════════════════════════════════════════════
function generateDesignSuggestions(unitType, style, totalArea, rooms) {
  const suggestions = [];

  if (style === 'modern') {
    suggestions.push({ category: 'Design', text: 'Open-plan living+dining with kitchen island for modern flow' });
    suggestions.push({ category: 'Materials', text: 'Vitrified tiles (600×600mm), acrylic paint, powder-coated aluminium windows' });
    suggestions.push({ category: 'Lighting', text: 'Recessed LED panels in living, pendant in dining, cove lighting in bedrooms' });
  } else if (style === 'traditional') {
    suggestions.push({ category: 'Design', text: 'Dedicated pooja room in North-East corner per Vastu Shastra' });
    suggestions.push({ category: 'Materials', text: 'Marble/granite flooring, solid teak doors, brass fittings' });
    suggestions.push({ category: 'Lighting', text: 'Traditional chandeliers, wall sconces, warm 3000K color temperature' });
  } else {
    suggestions.push({ category: 'Design', text: 'Clean lines, minimal furniture, maximize negative space' });
    suggestions.push({ category: 'Materials', text: 'Micro-topping floors, matte surfaces, concealed storage' });
    suggestions.push({ category: 'Lighting', text: 'Track lighting, minimal fixtures, maximum natural light' });
  }

  if (totalArea < 600) {
    suggestions.push({ category: 'Space', text: 'Multi-functional furniture — sofa-cum-bed, wall-mounted desk' });
    suggestions.push({ category: 'Storage', text: 'Maximize vertical storage with loft above wardrobes and kitchen cabinets' });
  }

  suggestions.push({ category: 'Ventilation', text: 'Cross-ventilation in all bedrooms with windows on opposite/adjacent walls' });
  suggestions.push({ category: 'Safety', text: 'Fire-rated doors for kitchen, emergency exit path from all bedrooms' });
  suggestions.push({ category: 'Structure', text: 'RCC columns at 3-4m centers, 230mm exterior walls, 150mm partitions' });
  suggestions.push({ category: 'Plumbing', text: 'Cluster wet areas (kitchen + bathrooms + utility) for efficient plumbing runs' });

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════
// MULTIPLE DESIGN OPTIONS GENERATOR
// ═══════════════════════════════════════════════════════════════
function generateMultipleOptions(roomDefs, plotW, plotD, wallT, facing, vastuCompliant) {
  const options = [];
  const labels = ['Option A — Standard', 'Option B — Open Plan', 'Option C — Max Bedroom', 'Option D — Max Outdoor'];

  for (let i = 0; i < 4; i++) {
    let modifiedRooms = roomDefs.map(r => ({ ...r }));

    if (i === 1) {
      // Open plan: merge living + kitchen ratio
      const living = modifiedRooms.find(r => r.name.includes('Living'));
      const kitchen = modifiedRooms.find(r => r.name === 'Kitchen');
      if (living && kitchen) {
        living.ratio += kitchen.ratio * 0.3;
        kitchen.ratio *= 0.7;
      }
    } else if (i === 2) {
      // Max bedroom: increase bedroom ratios
      modifiedRooms.forEach(r => {
        if (r.type === 'bedroom') r.ratio *= 1.15;
        if (r.type === 'living') r.ratio *= 0.85;
      });
    } else if (i === 3) {
      // Max outdoor: increase balcony
      modifiedRooms.forEach(r => {
        if (r.type === 'balcony') r.ratio *= 1.8;
        if (r.type === 'living') r.ratio *= 0.9;
      });
    }

    // Normalize ratios
    const totalRatio = modifiedRooms.reduce((s, r) => s + r.ratio, 0);
    modifiedRooms = modifiedRooms.map(r => ({ ...r, ratio: r.ratio / totalRatio }));

    options.push({ label: labels[i], rooms: modifiedRooms });
  }

  return options;
}

// ═══════════════════════════════════════════════════════════════
// API: Generate Floor Plan
// ═══════════════════════════════════════════════════════════════
exports.generateFloorPlan = async (req, res) => {
  try {
    const {
      unit_type = '2BHK', total_area_sqft = 1000,
      plot_width_ft = 40, plot_depth_ft = 25,
      facing = 'North', vastu_compliant = true,
      style = 'modern', include_pooja = false,
      include_study = false, include_servant = false,
    } = req.body;

    const roomTemplates = ROOM_STANDARDS[unit_type];
    if (!roomTemplates) return res.status(400).json({ message: `Invalid unit type: ${unit_type}` });

    // Calculate room areas
    let rooms = roomTemplates.map(t => {
      const targetArea = total_area_sqft * t.ratio;
      const area = Math.max(t.minArea, Math.min(t.maxArea, targetArea));
      return { ...t, area: Math.round(area) };
    });

    if (include_pooja) rooms.push({ name: 'Pooja Room', area: Math.round(total_area_sqft * 0.03), ratio: 0.03, type: 'pooja', zone: 'NE', adjacency: ['Living + Dining', 'Passage'], minW: 1500, minD: 1500 });
    if (include_study && !rooms.find(r => r.name === 'Study')) rooms.push({ name: 'Study', area: Math.round(total_area_sqft * 0.05), ratio: 0.05, type: 'study', zone: 'W', adjacency: ['Passage'], minW: 2400, minD: 2400 });
    if (include_servant) rooms.push({ name: 'Servant Room', area: Math.round(total_area_sqft * 0.04), ratio: 0.04, type: 'utility', zone: 'NW', adjacency: ['Kitchen', 'Utility'], minW: 2100, minD: 2100 });

    const currentTotal = rooms.reduce((s, r) => s + r.area, 0);
    const scaleFactor = total_area_sqft / currentTotal;
    rooms = rooms.map(r => ({ ...r, area: Math.round(r.area * scaleFactor) }));

    const plotWidthMM = plot_width_ft * 304.8;
    const plotDepthMM = plot_depth_ft * 304.8;
    const wallThickness = 230;

    // Generate professional layout
    const layout = generateProfessionalLayout(rooms, plotWidthMM, plotDepthMM, wallThickness, facing, vastu_compliant);
    const vastuAnalysis = vastu_compliant ? analyzeVastu(layout, plotWidthMM, plotDepthMM, facing) : null;
    const walls = generateSharedWalls(layout, wallThickness, plotWidthMM, plotDepthMM);
    const doors = generateSmartDoors(layout, rooms, wallThickness, facing);
    const windows = generateSmartWindows(layout, wallThickness, plotWidthMM, plotDepthMM);
    const furniture = generateFurnitureLayout(layout);
    const columns = generateColumnGrid(layout, wallThickness, plotWidthMM, plotDepthMM);
    const stairs = generateStaircase(layout, plotWidthMM, plotDepthMM, wallThickness);
    const dimensions = generateDimensions(layout, plotWidthMM, plotDepthMM, wallThickness);
    const suggestions = generateDesignSuggestions(unit_type, style, total_area_sqft, rooms);

    // Generate multiple design options
    const designOptions = generateMultipleOptions(rooms, plotWidthMM, plotDepthMM, wallThickness, facing, vastu_compliant);

    res.json({
      unit_type, total_area_sqft,
      plot_dimensions: { width_ft: plot_width_ft, depth_ft: plot_depth_ft, width_mm: plotWidthMM, depth_mm: plotDepthMM },
      facing, vastu_compliant, style,
      rooms: layout, walls, doors, windows, furniture, columns, stairs, dimensions,
      vastu_analysis: vastuAnalysis, suggestions, design_options: designOptions,
      element_summary: {
        rooms: layout.length, walls: walls.length, doors: doors.length,
        windows: windows.length, furniture: furniture.length, columns: columns.length,
      },
    });
  } catch (err) {
    console.error('AI Generate Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// API: Design Suggestions for Existing Project
// ═══════════════════════════════════════════════════════════════
exports.getDesignSuggestions = async (req, res) => {
  try {
    const project = await BIMProject.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const siteData = project.site_data || {};
    const suggestions = [];

    if (siteData.plot_area && siteData.built_up_area) {
      const coverage = (siteData.built_up_area / siteData.plot_area) * 100;
      if (coverage > 60) suggestions.push({ type: 'warning', category: 'Coverage', text: `Ground coverage ${coverage.toFixed(0)}% exceeds typical 60% limit. Consider reducing footprint.` });
      if (coverage < 30) suggestions.push({ type: 'tip', category: 'Coverage', text: `Ground coverage only ${coverage.toFixed(0)}%. Consider adding landscaping or outdoor amenities.` });
    }

    if (siteData.fsi && siteData.plot_area) {
      const maxBuiltUp = siteData.plot_area * siteData.fsi;
      suggestions.push({ type: 'info', category: 'FSI', text: `Max permissible built-up area: ${maxBuiltUp.toFixed(0)} sqm (FSI: ${siteData.fsi})` });
    }

    suggestions.push({ type: 'tip', category: 'Energy', text: 'Orient main building axis East-West for optimal solar gain control' });
    suggestions.push({ type: 'tip', category: 'Energy', text: 'Install 3kW rooftop solar (min) for a 2BHK unit — saves ₹3,000-5,000/month' });
    suggestions.push({ type: 'info', category: 'Green', text: 'Consider IGBC/GRIHA pre-certification for 5-10% property value increase' });
    suggestions.push({ type: 'tip', category: 'Water', text: 'Rainwater harvesting mandatory — size tank at 50L per sqm of roof area' });

    res.json({ suggestions, project_name: project.design_name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// API: Vastu Analysis for Existing Project
// ═══════════════════════════════════════════════════════════════
exports.vastuAnalysis = async (req, res) => {
  try {
    const project = await BIMProject.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const siteData = project.site_data || {};
    const facing = req.query.facing || 'North';

    const floors = await BIMFloor.find({ building_id: { $in: (project.buildings || []) } }).populate('rooms');
    const allRooms = floors.flatMap(f => (f.rooms || []).map(r => ({
      name: r.room_name || r.room_type || r.name || 'Room',
      x: r.boundary_points?.[0]?.x || r.boundary?.[0]?.x || 0,
      y: r.boundary_points?.[0]?.y || r.boundary?.[0]?.y || 0,
      width: r.dimensions?.width || 4000,
      depth: r.dimensions?.length || 3000,
    })));

    const plotW = (siteData.plot_dimensions?.width || siteData.dimensions?.width || 40) * 304.8 / 0.3048;
    const plotD = (siteData.plot_dimensions?.length || siteData.dimensions?.depth || 25) * 304.8 / 0.3048;

    const analysis = allRooms.length > 0
      ? analyzeVastu(allRooms, plotW, plotD, facing)
      : { score: 0, total: 0, percentage: 0, compliance: [], violations: [], message: 'No rooms found. Add rooms to get Vastu analysis.' };

    res.json({ analysis, facing, project_name: project.design_name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// API: Generate AND Save to Database
// ═══════════════════════════════════════════════════════════════
exports.generateAndSave = async (req, res) => {
  try {
    const {
      project_id, design_name, unit_type = '2BHK',
      total_area_sqft = 1000, plot_width_ft = 40, plot_depth_ft = 25,
      facing = 'North', vastu_compliant = true, style = 'modern',
      include_pooja = false, include_study = false, include_servant = false,
    } = req.body;

    const { userId, company_id } = req.user;
    const roomTemplates = ROOM_STANDARDS[unit_type];
    if (!roomTemplates) return res.status(400).json({ message: `Invalid unit type: ${unit_type}` });

    if (project_id) {
      const erpProject = await Project.findById(project_id);
      if (!erpProject) return res.status(400).json({ message: 'Linked ERP project not found' });
    }

    // Generate layout
    let rooms = roomTemplates.map(t => {
      const targetArea = total_area_sqft * t.ratio;
      return { ...t, area: Math.round(Math.max(t.minArea, Math.min(t.maxArea, targetArea))) };
    });

    if (include_pooja) rooms.push({ name: 'Pooja Room', area: Math.round(total_area_sqft * 0.03), ratio: 0.03, type: 'pooja', zone: 'NE', adjacency: ['Living + Dining'], minW: 1500, minD: 1500 });
    if (include_study && !rooms.find(r => r.name === 'Study')) rooms.push({ name: 'Study', area: Math.round(total_area_sqft * 0.05), ratio: 0.05, type: 'study', zone: 'W', adjacency: ['Passage'], minW: 2400, minD: 2400 });
    if (include_servant) rooms.push({ name: 'Servant Room', area: Math.round(total_area_sqft * 0.04), ratio: 0.04, type: 'utility', zone: 'NW', adjacency: ['Kitchen'], minW: 2100, minD: 2100 });

    const currentTotal = rooms.reduce((s, r) => s + r.area, 0);
    const sf = total_area_sqft / currentTotal;
    rooms = rooms.map(r => ({ ...r, area: Math.round(r.area * sf) }));

    const plotWidthMM = plot_width_ft * 304.8;
    const plotDepthMM = plot_depth_ft * 304.8;
    const wallThickness = 230;

    const layout = generateProfessionalLayout(rooms, plotWidthMM, plotDepthMM, wallThickness, facing, vastu_compliant);
    const vastuAnalysisResult = vastu_compliant ? analyzeVastu(layout, plotWidthMM, plotDepthMM, facing) : null;
    const generatedWalls = generateSharedWalls(layout, wallThickness, plotWidthMM, plotDepthMM);
    const generatedDoors = generateSmartDoors(layout, rooms, wallThickness, facing);
    const generatedWindows = generateSmartWindows(layout, wallThickness, plotWidthMM, plotDepthMM);
    const generatedFurniture = generateFurnitureLayout(layout);
    const generatedColumns = generateColumnGrid(layout, wallThickness, plotWidthMM, plotDepthMM);
    const suggestions = generateDesignSuggestions(unit_type, style, total_area_sqft, rooms);

    // Save to MongoDB
    const bimProject = await BIMProject.create({
      project_id: project_id || undefined, company_id, created_by: userId,
      design_name: design_name || `AI ${unit_type} — ${total_area_sqft} sqft (${style})`,
      description: `AI-generated ${unit_type} floor plan. ${total_area_sqft} sqft, ${facing}-facing, ${style} style.${vastu_compliant ? ' Vastu-compliant.' : ''}`,
      status: 'draft',
      site_data: {
        total_area: total_area_sqft * 0.0929, built_up_area: total_area_sqft * 0.0929,
        carpet_area: total_area_sqft * 0.0929 * 0.85,
        plot_dimensions: { length: plot_depth_ft * 0.3048, width: plot_width_ft * 0.3048 },
      },
      coordinate_system: 'metric',
      collaborators: [{ user_id: userId, role: 'owner' }],
    });

    const building = await BIMBuilding.create({
      bim_project_id: bimProject._id, company_id, name: 'Main Building',
      building_type: 'residential', num_floors: 1, floor_height: 3000, total_height: 3000,
      footprint: { length: plotDepthMM, width: plotWidthMM },
    });

    const floor = await BIMFloor.create({
      building_id: building._id, bim_project_id: bimProject._id, company_id,
      floor_number: 0, floor_name: 'Ground Floor', level_height: 3000, floor_type: 'ground',
      total_area: total_area_sqft * 0.0929, carpet_area: total_area_sqft * 0.0929 * 0.85,
    });

    // Save rooms
    const roomDocs = [];
    for (const room of layout) {
      const doc = await BIMRoom.create({
        floor_id: floor._id, bim_project_id: bimProject._id, company_id,
        name: room.name, room_type: room.type || guessRoomType(room.name),
        boundary_points: [
          { x: room.x, y: room.y }, { x: room.x + room.width, y: room.y },
          { x: room.x + room.width, y: room.y + room.depth }, { x: room.x, y: room.y + room.depth },
        ],
        area: room.actual_area_sqft ? room.actual_area_sqft * 0.0929 : room.area_sqft * 0.0929,
        height: 3000,
        label_position: { x: room.x + room.width / 2, y: room.y + room.depth / 2 },
      });
      roomDocs.push(doc._id);
    }

    // Save walls
    const wallDocs = [];
    for (const wall of generatedWalls) {
      const doc = await BIMWall.create({
        floor_id: floor._id, bim_project_id: bimProject._id, company_id,
        wall_type: wall.wall_type, start_point: wall.start_point, end_point: wall.end_point,
        thickness: wall.thickness, height: wall.height, canvas_id: wall.canvas_id,
      });
      wallDocs.push(doc._id);
    }

    // Save doors
    const doorDocs = [];
    for (const door of generatedDoors) {
      const doc = await BIMDoor.create({
        floor_id: floor._id, bim_project_id: bimProject._id, company_id,
        position: door.position, door_type: door.door_type, width: door.width,
        height: door.height, swing_direction: door.swing || 'left', canvas_id: door.canvas_id,
      });
      doorDocs.push(doc._id);
    }

    // Save windows
    const windowDocs = [];
    for (const win of generatedWindows) {
      const doc = await BIMWindow.create({
        floor_id: floor._id, bim_project_id: bimProject._id, company_id,
        position: win.position, window_type: win.window_type, width: win.width,
        height: win.height, sill_height: win.sill_height || 900, canvas_id: win.canvas_id,
      });
      windowDocs.push(doc._id);
    }

    // Update floor with references
    floor.rooms = roomDocs;
    floor.elements = { walls: wallDocs, doors: doorDocs, windows: windowDocs, columns: [], beams: [], stairs: [], furniture: [] };
    await floor.save();

    building.floors = [floor._id];
    await building.save();

    bimProject.buildings = [building._id];
    await bimProject.save();

    await createNotification({
      user_id: userId,
      message: `AI Architect generated "${bimProject.design_name}" successfully`,
      type: 'general', link: `/bim/studio/${bimProject._id}`,
      metadata: { bim_project_id: bimProject._id },
    });

    const populated = await BIMProject.findById(bimProject._id)
      .populate('project_id', 'project_name project_id client_name')
      .populate('created_by', 'name email')
      .populate({ path: 'buildings', populate: { path: 'floors', populate: 'rooms' } });

    res.status(201).json({
      bim_project: populated,
      generation_summary: {
        unit_type, total_area_sqft, rooms: layout.length, walls: generatedWalls.length,
        doors: generatedDoors.length, windows: generatedWindows.length,
        furniture: generatedFurniture.length, columns: generatedColumns.length,
        vastu_analysis: vastuAnalysisResult, suggestions,
      },
    });
  } catch (err) {
    console.error('AI Generate & Save Error:', err);
    res.status(500).json({ message: err.message || 'Failed to generate and save floor plan' });
  }
};

// Helper: guess room type from name
function guessRoomType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('bedroom') || n.includes('master')) return 'bedroom';
  if (n.includes('living') || n.includes('dining')) return 'living';
  if (n.includes('kitchen')) return 'kitchen';
  if (n.includes('bath') || n.includes('toilet')) return 'bathroom';
  if (n.includes('balcony')) return 'balcony';
  if (n.includes('pooja') || n.includes('prayer')) return 'pooja';
  if (n.includes('study') || n.includes('office')) return 'study';
  if (n.includes('utility') || n.includes('servant')) return 'utility';
  if (n.includes('passage') || n.includes('corridor')) return 'passage';
  if (n.includes('store') || n.includes('storage')) return 'utility';
  return 'bedroom';
}
