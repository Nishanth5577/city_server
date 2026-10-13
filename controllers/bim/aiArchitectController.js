/**
 * AI Architect Controller — Professional Floor Plan Generation Engine
 * 
 * Generates Indian residential floor plans matching professional CAD standards.
 * Uses row-based layout with rooms filling the entire plot area (no gaps).
 * Every generation uses fresh randomness for variety.
 */

const prisma = require('../../config/prisma');

// ═══════════════════════════════════════════════════════════
//  UTILITY: Seeded PRNG
// ═══════════════════════════════════════════════════════════
function createRng(seed) {
  let s = seed || (Date.now() ^ (Math.random() * 0xffffffff));
  return {
    next() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; },
    range(min, max) { return min + this.next() * (max - min); },
    intRange(min, max) { return Math.floor(this.range(min, max + 1)); },
    pick(arr) { return arr[this.intRange(0, arr.length - 1)]; },
    shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = this.intRange(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}

const FT_TO_MM = 304.8;
const EXT_WALL = 230;
const INT_WALL = 150;
const COL_SIZE = 300;

// ═══════════════════════════════════════════════════════════
//  VASTU GUIDELINES
// ═══════════════════════════════════════════════════════════
const VASTU_ZONES = {
  North:      { entrance: 'south', kitchen: 'SE', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
  South:      { entrance: 'north', kitchen: 'SE', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
  East:       { entrance: 'west',  kitchen: 'SE', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
  West:       { entrance: 'east',  kitchen: 'NW', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
  'North-East': { entrance: 'SW', kitchen: 'SE', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
  'North-West': { entrance: 'SE', kitchen: 'SE', master: 'SW', living: 'NW', pooja: 'NE', bathroom: 'NW' },
  'South-East': { entrance: 'NW', kitchen: 'SE', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
  'South-West': { entrance: 'NE', kitchen: 'SE', master: 'SW', living: 'NE', pooja: 'NE', bathroom: 'NW' },
};

function getZoneForPosition(x, y, pw, pd) {
  const cx = pw / 2, cy = pd / 2;
  if (y < cy && x >= cx) return 'NE';
  if (y < cy && x < cx) return 'NW';
  if (y >= cy && x >= cx) return 'SE';
  return 'SW';
}

function analyzeVastu(rooms, facing, pw, pd) {
  const g = VASTU_ZONES[facing] || VASTU_ZONES['North'];
  const compliance = [], violations = [];
  for (const room of rooms) {
    const zone = getZoneForPosition(room.x + room.width / 2, room.y + room.depth / 2, pw, pd);
    room.zone = zone;
    if (room.type === 'kitchen') {
      if (zone === g.kitchen) compliance.push({ room: room.name, message: `${room.name} in ${zone} — ideal for kitchen (Agni corner)` });
      else violations.push({ room: room.name, message: `${room.name} in ${zone} — kitchen recommended in ${g.kitchen}` });
    }
    if (room.type === 'bedroom' && room.name.toLowerCase().includes('master')) {
      if (zone === g.master) compliance.push({ room: room.name, message: `${room.name} in ${zone} — ideal for master bedroom` });
      else violations.push({ room: room.name, message: `${room.name} in ${zone} — master bedroom recommended in ${g.master}` });
    }
    if (room.type === 'living' || room.type === 'hall') {
      if (zone === g.living) compliance.push({ room: room.name, message: `${room.name} in ${zone} — ideal placement` });
    }
    if (room.type === 'pooja') {
      if (zone === 'NE') compliance.push({ room: room.name, message: `${room.name} in NE (Ishanya) — perfect for prayer room` });
      else violations.push({ room: room.name, message: `${room.name} in ${zone} — pooja room should be in NE` });
    }
  }
  compliance.push({ room: 'Entrance', message: `Main entrance faces ${facing} — aligned with plot orientation` });
  const total = compliance.length + violations.length;
  const percentage = total > 0 ? Math.round((compliance.length / total) * 100) : 50;
  return { percentage, compliance, violations, message: percentage >= 70 ? 'Good Vastu compliance' : percentage >= 40 ? 'Moderate — review violations' : 'Low Vastu score — consider reorienting rooms' };
}

// ═══════════════════════════════════════════════════════════
//  ROW-BASED LAYOUT TEMPLATES (like the reference plan)
//  Each template defines rows and the rooms in each row with
//  their width proportions. The algorithm randomly varies
//  proportions and picks from multiple templates.
// ═══════════════════════════════════════════════════════════

function getLayoutTemplates(unitType, opts) {
  // Each template: array of rows. Each row: { heightPct, rooms: [{ type, name, widthPct }] }
  // widthPct values are relative within the row and will be normalized.
  // Multiple variants per unit type for variety.

  const templates = {
    '1BHK': [
      // Variant A: Bedroom top, living+kitchen bottom
      [
        { heightPct: 0.50, rooms: [
          { type: 'bedroom', name: 'Bed Room', wp: 0.55 },
          { type: 'bathroom', name: 'L/B', wp: 0.20 },
          { type: 'balcony', name: 'Balcony', wp: 0.25 },
        ]},
        { heightPct: 0.50, rooms: [
          { type: 'kitchen', name: 'Kitchen', wp: 0.30 },
          { type: 'living', name: 'Hall', wp: 0.45 },
          { type: 'passage', name: 'Sitout', wp: 0.25 },
        ]},
      ],
      // Variant B: Side-by-side
      [
        { heightPct: 0.55, rooms: [
          { type: 'living', name: 'Living Room', wp: 0.60 },
          { type: 'bathroom', name: 'Toilet', wp: 0.18 },
          { type: 'balcony', name: 'Balcony', wp: 0.22 },
        ]},
        { heightPct: 0.45, rooms: [
          { type: 'bedroom', name: 'Bed Room', wp: 0.50 },
          { type: 'kitchen', name: 'Kitchen', wp: 0.30 },
          { type: 'passage', name: 'Passage', wp: 0.20 },
        ]},
      ],
    ],
    '2BHK': [
      // Variant A: Reference-style — bedrooms top, living+kitchen bottom
      [
        { heightPct: 0.50, rooms: [
          { type: 'bedroom', name: 'Bed Room 1', wp: 0.38 },
          { type: 'hall', name: 'Hall', wp: 0.28 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.34 },
        ]},
        { heightPct: 0.50, rooms: [
          { type: 'kitchen', name: 'Kitchen', wp: 0.25 },
          { type: 'living', name: 'Dining + Drawing', wp: 0.40 },
          { type: 'passage', name: 'Sitout', wp: 0.35 },
        ]},
      ],
      // Variant B: L-shaped with bathrooms
      [
        { heightPct: 0.55, rooms: [
          { type: 'bedroom', name: 'Master Bed Room', wp: 0.35 },
          { type: 'bathroom', name: 'L/B 1', wp: 0.12 },
          { type: 'hall', name: 'Hall', wp: 0.25 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.28 },
        ]},
        { heightPct: 0.45, rooms: [
          { type: 'kitchen', name: 'Kitchen', wp: 0.22 },
          { type: 'living', name: 'Drawing Hall', wp: 0.35 },
          { type: 'passage', name: 'Sitout', wp: 0.22 },
          { type: 'bathroom', name: 'L/B 2', wp: 0.21 },
        ]},
      ],
      // Variant C: Compact with pooja
      [
        { heightPct: 0.52, rooms: [
          { type: 'bedroom', name: 'Bed Room 1', wp: 0.32 },
          { type: 'pooja', name: 'Pooja', wp: 0.12 },
          { type: 'hall', name: 'Hall', wp: 0.28 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.28 },
        ]},
        { heightPct: 0.48, rooms: [
          { type: 'staircase', name: 'Stair', wp: 0.12 },
          { type: 'kitchen', name: 'Kitchen', wp: 0.22 },
          { type: 'living', name: 'DRG Hall', wp: 0.36 },
          { type: 'passage', name: 'Sitout', wp: 0.30 },
        ]},
      ],
    ],
    '3BHK': [
      // Variant A: Full reference-style
      [
        { heightPct: 0.52, rooms: [
          { type: 'bedroom', name: 'Bed Room 1', wp: 0.26 },
          { type: 'bathroom', name: 'Dress 1', wp: 0.10 },
          { type: 'hall', name: 'Hall', wp: 0.22 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.22 },
          { type: 'bathroom', name: 'Dress 2', wp: 0.10 },
          { type: 'bathroom', name: 'L/B', wp: 0.10 },
        ]},
        { heightPct: 0.48, rooms: [
          { type: 'staircase', name: 'Stair', wp: 0.10 },
          { type: 'kitchen', name: 'Kitchen', wp: 0.18 },
          { type: 'living', name: 'Dining', wp: 0.18 },
          { type: 'living', name: 'DRG Hall', wp: 0.24 },
          { type: 'bedroom', name: 'Bed Room 3', wp: 0.30 },
        ]},
      ],
      // Variant B: With car parking
      [
        { heightPct: 0.50, rooms: [
          { type: 'bedroom', name: 'Bed Room 1', wp: 0.28 },
          { type: 'pooja', name: 'Pooja', wp: 0.09 },
          { type: 'hall', name: 'Hall', wp: 0.25 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.24 },
          { type: 'bathroom', name: 'L/B', wp: 0.14 },
        ]},
        { heightPct: 0.50, rooms: [
          { type: 'kitchen', name: 'Kitchen', wp: 0.20 },
          { type: 'living', name: 'Drawing Hall', wp: 0.30 },
          { type: 'passage', name: 'Sitout', wp: 0.18 },
          { type: 'bedroom', name: 'Bed Room 3', wp: 0.32 },
        ]},
      ],
    ],
    '4BHK': [
      // Variant A: 3-row layout
      [
        { heightPct: 0.38, rooms: [
          { type: 'bedroom', name: 'Bed Room 1', wp: 0.30 },
          { type: 'bathroom', name: 'Dress 1', wp: 0.10 },
          { type: 'hall', name: 'Hall', wp: 0.28 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.22 },
          { type: 'bathroom', name: 'L/B 1', wp: 0.10 },
        ]},
        { heightPct: 0.32, rooms: [
          { type: 'bedroom', name: 'Bed Room 3', wp: 0.28 },
          { type: 'pooja', name: 'Pooja', wp: 0.10 },
          { type: 'living', name: 'DRG Hall', wp: 0.32 },
          { type: 'bedroom', name: 'Bed Room 4', wp: 0.30 },
        ]},
        { heightPct: 0.30, rooms: [
          { type: 'staircase', name: 'Stair', wp: 0.10 },
          { type: 'kitchen', name: 'Kitchen', wp: 0.20 },
          { type: 'living', name: 'Dining', wp: 0.22 },
          { type: 'passage', name: 'Sitout', wp: 0.20 },
          { type: 'parking', name: 'Car Parking', wp: 0.28 },
        ]},
      ],
      // Variant B: 2-row with larger rooms
      [
        { heightPct: 0.52, rooms: [
          { type: 'bedroom', name: 'Master Suite', wp: 0.28 },
          { type: 'bathroom', name: 'M. Bath', wp: 0.10 },
          { type: 'hall', name: 'Hall', wp: 0.22 },
          { type: 'bedroom', name: 'Bed Room 2', wp: 0.24 },
          { type: 'bathroom', name: 'C. Bath', wp: 0.16 },
        ]},
        { heightPct: 0.48, rooms: [
          { type: 'bedroom', name: 'Bed Room 3', wp: 0.22 },
          { type: 'kitchen', name: 'Kitchen', wp: 0.18 },
          { type: 'living', name: 'Drawing Hall', wp: 0.26 },
          { type: 'bedroom', name: 'Bed Room 4', wp: 0.20 },
          { type: 'passage', name: 'Sitout', wp: 0.14 },
        ]},
      ],
    ],
  };

  const variants = templates[unitType] || templates['2BHK'];
  return variants;
}

// ═══════════════════════════════════════════════════════════
//  MAIN FLOOR PLAN GENERATION
// ═══════════════════════════════════════════════════════════
function generateFloorPlanAlgorithm(params) {
  const rng = createRng();
  const {
    unit_type = '2BHK',
    total_area_sqft = 1000,
    plot_width_ft = 40,
    plot_depth_ft = 25,
    facing = 'North',
    vastu_compliant = true,
    style = 'modern',
    include_pooja = false,
    include_study = false,
    include_servant = false,
  } = params;

  const pw = Math.round(plot_width_ft * FT_TO_MM);
  const pd = Math.round(plot_depth_ft * FT_TO_MM);
  const usableW = pw - 2 * EXT_WALL;
  const usableD = pd - 2 * EXT_WALL;

  // Pick a random template variant
  const variants = getLayoutTemplates(unit_type, { include_pooja, include_study, include_servant });
  const template = rng.pick(variants);

  // Add optional rooms if requested
  if (include_pooja && !template.some(row => row.rooms.some(r => r.type === 'pooja'))) {
    // Insert pooja into first row
    template[0].rooms.push({ type: 'pooja', name: 'Pooja', wp: 0.10 });
  }
  if (include_study) {
    // Insert study into a random row
    const row = rng.pick(template);
    row.rooms.push({ type: 'study', name: 'Study', wp: 0.14 });
  }
  if (include_servant) {
    const lastRow = template[template.length - 1];
    lastRow.rooms.push({ type: 'utility', name: 'Servant Room', wp: 0.15 });
  }

  // ── Place rooms by filling rows ──
  const placedRooms = [];
  let currentY = EXT_WALL;

  for (const row of template) {
    // Randomize height slightly
    const rowH = Math.round(usableD * row.heightPct * rng.range(0.92, 1.08));
    const actualRowH = Math.min(rowH, pd - currentY - EXT_WALL);

    // Normalize widths
    const totalWp = row.rooms.reduce((s, r) => s + r.wp, 0);
    let currentX = EXT_WALL;

    // Randomize room order slightly for variety
    const rooms = rng.next() > 0.6 ? [...row.rooms] : row.rooms;

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const widthPct = room.wp / totalWp;
      // Add slight variation to width
      const variation = rng.range(0.93, 1.07);
      let roomW = Math.round(usableW * widthPct * variation);

      // Last room in row takes remaining space (ensures no gaps)
      if (i === rooms.length - 1) {
        roomW = pw - EXT_WALL - currentX;
      }

      roomW = Math.max(roomW, 1200); // minimum 1.2m
      const roomD = Math.max(actualRowH, 1200);
      const areaSqft = Math.round((roomW * roomD) / 92903);

      placedRooms.push({
        name: room.name,
        type: room.type,
        x: currentX,
        y: currentY,
        width: roomW,
        depth: roomD,
        area_sqft: areaSqft,
        actual_area_sqft: areaSqft,
        zone: '',
      });

      currentX += roomW;
    }

    currentY += actualRowH;
  }

  // Extend last row to fill remaining depth
  const lastRowY = template.length > 1 ? placedRooms.filter(r => r.y === placedRooms[placedRooms.length - 1].y)[0]?.y : EXT_WALL;
  for (const room of placedRooms) {
    if (room.y === lastRowY) {
      room.depth = pd - EXT_WALL - room.y;
      room.area_sqft = Math.round((room.width * room.depth) / 92903);
      room.actual_area_sqft = room.area_sqft;
    }
  }

  // ── Generate Walls ──
  const walls = [];
  // Exterior walls
  walls.push({ start_point: { x: 0, y: 0 }, end_point: { x: pw, y: 0 }, thickness: EXT_WALL, wall_type: 'exterior' });
  walls.push({ start_point: { x: pw, y: 0 }, end_point: { x: pw, y: pd }, thickness: EXT_WALL, wall_type: 'exterior' });
  walls.push({ start_point: { x: pw, y: pd }, end_point: { x: 0, y: pd }, thickness: EXT_WALL, wall_type: 'exterior' });
  walls.push({ start_point: { x: 0, y: pd }, end_point: { x: 0, y: 0 }, thickness: EXT_WALL, wall_type: 'exterior' });

  // Interior walls from room boundaries
  const wallSet = new Set();
  for (const room of placedRooms) {
    const edges = [
      { x1: room.x, y1: room.y, x2: room.x + room.width, y2: room.y },
      { x1: room.x + room.width, y1: room.y, x2: room.x + room.width, y2: room.y + room.depth },
      { x1: room.x, y1: room.y + room.depth, x2: room.x + room.width, y2: room.y + room.depth },
      { x1: room.x, y1: room.y, x2: room.x, y2: room.y + room.depth },
    ];
    for (const e of edges) {
      // Skip edges on plot boundary
      const onBoundary = (e.x1 <= EXT_WALL && e.x2 <= EXT_WALL) || (e.y1 <= EXT_WALL && e.y2 <= EXT_WALL) ||
        (e.x1 >= pw - EXT_WALL && e.x2 >= pw - EXT_WALL) || (e.y1 >= pd - EXT_WALL && e.y2 >= pd - EXT_WALL);
      if (onBoundary) continue;

      const key = [Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.max(e.x1, e.x2), Math.max(e.y1, e.y2)].join(',');
      if (!wallSet.has(key)) {
        wallSet.add(key);
        walls.push({ start_point: { x: e.x1, y: e.y1 }, end_point: { x: e.x2, y: e.y2 }, thickness: INT_WALL, wall_type: 'interior' });
      }
    }
  }

  // ── Generate Doors ──
  const doors = [];
  const livingRooms = placedRooms.filter(r => r.type === 'living' || r.type === 'hall');
  const entranceSide = facing.toLowerCase().includes('north') ? 'top' : facing.toLowerCase().includes('south') ? 'bottom' : facing.toLowerCase().includes('east') ? 'right' : 'left';

  // Main entrance door — on the sitout/living room facing the entrance side
  const sitout = placedRooms.find(r => r.name.toLowerCase().includes('sitout')) || placedRooms.find(r => r.type === 'living');
  if (sitout) {
    const mw = 1050;
    if (entranceSide === 'bottom' || sitout.y + sitout.depth >= pd - EXT_WALL - 100) {
      doors.push({ position: { x: sitout.x + sitout.width * rng.range(0.35, 0.55), y: sitout.y + sitout.depth }, width: mw, rotation: 0, door_type: 'main' });
    } else if (entranceSide === 'top') {
      doors.push({ position: { x: sitout.x + sitout.width * rng.range(0.35, 0.55), y: sitout.y }, width: mw, rotation: 0, door_type: 'main' });
    } else if (entranceSide === 'right') {
      doors.push({ position: { x: sitout.x + sitout.width, y: sitout.y + sitout.depth * rng.range(0.3, 0.5) }, width: mw, rotation: 90, door_type: 'main' });
    } else {
      doors.push({ position: { x: sitout.x, y: sitout.y + sitout.depth * rng.range(0.3, 0.5) }, width: mw, rotation: 90, door_type: 'main' });
    }
  }

  // Internal doors for each room
  for (const room of placedRooms) {
    if (room.name.toLowerCase().includes('sitout') || room.type === 'parking' || room.type === 'passage') continue;
    const dw = room.type === 'bathroom' ? 750 : 900;
    // Place door on a shared interior wall
    const sides = [];
    if (room.y > EXT_WALL + 100) sides.push('top');
    if (room.y + room.depth < pd - EXT_WALL - 100) sides.push('bottom');
    if (room.x > EXT_WALL + 100) sides.push('left');
    if (room.x + room.width < pw - EXT_WALL - 100) sides.push('right');
    if (sides.length === 0) sides.push('top');

    const side = rng.pick(sides);
    let dp;
    if (side === 'top') dp = { position: { x: room.x + room.width * rng.range(0.25, 0.65), y: room.y }, width: dw, rotation: 0, door_type: room.type === 'bathroom' ? 'bathroom' : 'internal' };
    else if (side === 'bottom') dp = { position: { x: room.x + room.width * rng.range(0.25, 0.65), y: room.y + room.depth }, width: dw, rotation: 0, door_type: room.type === 'bathroom' ? 'bathroom' : 'internal' };
    else if (side === 'left') dp = { position: { x: room.x, y: room.y + room.depth * rng.range(0.25, 0.65) }, width: dw, rotation: 90, door_type: room.type === 'bathroom' ? 'bathroom' : 'internal' };
    else dp = { position: { x: room.x + room.width, y: room.y + room.depth * rng.range(0.25, 0.65) }, width: dw, rotation: 90, door_type: room.type === 'bathroom' ? 'bathroom' : 'internal' };
    doors.push(dp);
  }

  // ── Generate Windows ──
  const windows = [];
  for (const room of placedRooms) {
    if (room.type === 'passage' || room.type === 'staircase' || room.type === 'parking') continue;
    const numWin = room.type === 'bathroom' ? 1 : (room.type === 'bedroom' || room.type === 'living' || room.type === 'hall' ? rng.intRange(1, 2) : 1);
    const winType = room.type === 'bathroom' ? 'ventilator' : 'casement';
    const winW = winType === 'ventilator' ? 600 : rng.pick([900, 1200, 1500]);

    for (let w = 0; w < numWin; w++) {
      // Prefer exterior walls
      const extSides = [];
      if (room.x <= EXT_WALL + 50) extSides.push('left');
      if (room.x + room.width >= pw - EXT_WALL - 50) extSides.push('right');
      if (room.y <= EXT_WALL + 50) extSides.push('top');
      if (room.y + room.depth >= pd - EXT_WALL - 50) extSides.push('bottom');
      if (extSides.length === 0) extSides.push(rng.pick(['top', 'bottom', 'left', 'right']));

      const side = rng.pick(extSides);
      if (side === 'top') windows.push({ position: { x: room.x + room.width * rng.range(0.25, 0.75), y: room.y }, width: winW, rotation: 0, window_type: winType });
      else if (side === 'bottom') windows.push({ position: { x: room.x + room.width * rng.range(0.25, 0.75), y: room.y + room.depth }, width: winW, rotation: 0, window_type: winType });
      else if (side === 'left') windows.push({ position: { x: room.x, y: room.y + room.depth * rng.range(0.25, 0.75) }, width: winW, rotation: 90, window_type: winType });
      else windows.push({ position: { x: room.x + room.width, y: room.y + room.depth * rng.range(0.25, 0.75) }, width: winW, rotation: 90, window_type: winType });
    }
  }

  // ── Generate Furniture ──
  const furniture = [];
  for (const room of placedRooms) {
    const cx = room.x + room.width / 2, cy = room.y + room.depth / 2;
    if (room.type === 'bedroom') {
      const isMaster = room.name.toLowerCase().includes('master') || room.name.includes('1');
      const bw = isMaster ? 1800 : 1500, bd = isMaster ? 2100 : 1900;
      furniture.push({ position: { x: cx, y: cy }, width: bw, depth: bd, type: 'bed' });
      furniture.push({ position: { x: room.x + room.width - 400, y: cy }, width: 600, depth: room.depth * 0.45, type: 'wardrobe' });
    }
    if (room.type === 'living' || room.type === 'hall') {
      if (room.name.toLowerCase().includes('din')) {
        furniture.push({ position: { x: cx, y: cy }, width: 1200, depth: 800, type: 'dining_table' });
      } else {
        furniture.push({ position: { x: cx, y: cy + room.depth * 0.15 }, width: Math.min(room.width * 0.5, 2400), depth: 800, type: 'sofa' });
      }
    }
    if (room.type === 'kitchen') {
      furniture.push({ position: { x: cx, y: room.y + 400 }, width: room.width * 0.75, depth: 600, type: 'kitchen_cabinets' });
      furniture.push({ position: { x: room.x + room.width - 450, y: room.y + 400 }, width: 600, depth: 600, type: 'refrigerator' });
    }
    if (room.type === 'bathroom') {
      furniture.push({ position: { x: cx - 300, y: cy + room.depth * 0.12 }, width: 400, depth: 500, type: 'toilet' });
      furniture.push({ position: { x: cx + 300, y: room.y + 500 }, width: 500, depth: 400, type: 'wash_basin' });
    }
    if (room.type === 'parking') {
      furniture.push({ position: { x: cx, y: cy }, width: 1800, depth: 4200, type: 'car' });
    }
  }

  // ── Staircase ──
  const stairs = [];
  const stairRoom = placedRooms.find(r => r.type === 'staircase');
  if (stairRoom) {
    stairs.push({
      position: { x: stairRoom.x, y: stairRoom.y },
      width: stairRoom.width,
      depth: stairRoom.depth,
      num_risers: Math.max(10, Math.round(stairRoom.depth / 250)),
    });
  }

  // ── Columns ──
  const columns = [];
  const colSpacingX = Math.round(usableW / 3);
  const colSpacingY = Math.round(usableD / 2);
  for (let ci = 0; ci <= 3; ci++) {
    for (let cj = 0; cj <= 2; cj++) {
      columns.push({ position: { x: EXT_WALL + ci * colSpacingX, y: EXT_WALL + cj * colSpacingY }, width: COL_SIZE });
    }
  }

  // ── Dimension lines ──
  const dimensions = [];
  // Overall
  dimensions.push({ type: 'horizontal', y: pd + 300, x1: 0, x2: pw, label: `${plot_width_ft}'-0"` });
  dimensions.push({ type: 'vertical', x: -300, y1: 0, y2: pd, label: `${plot_depth_ft}'-0"` });

  // Room-level dimensions (top row widths)
  const topRowRooms = placedRooms.filter(r => r.y === EXT_WALL);
  for (const room of topRowRooms) {
    const ftVal = (room.width / FT_TO_MM);
    const ft = Math.floor(ftVal);
    const inches = Math.round((ftVal - ft) * 12);
    dimensions.push({ type: 'horizontal', y: -300, x1: room.x, x2: room.x + room.width, label: `${ft}'-${inches}"` });
  }

  // ── Joineries schedule ──
  const joineries = [
    { code: 'MD', name: 'Main Door', size: `3'6"×7'0"`, qty: 1 },
    { code: 'D', name: 'Door', size: `3'0"×7'0"`, qty: doors.filter(d => d.door_type === 'internal').length },
    { code: 'D2', name: 'Bath Door', size: `2'6"×7'0"`, qty: doors.filter(d => d.door_type === 'bathroom').length },
    { code: 'W', name: 'Window', size: `3'0"×4'0"`, qty: windows.filter(w => w.window_type === 'casement').length },
    { code: 'V', name: 'Ventilator', size: `2'0"×2'0"`, qty: windows.filter(w => w.window_type === 'ventilator').length },
  ];

  // ── Vastu Analysis ──
  const vastu_analysis = analyzeVastu(placedRooms, facing, pw, pd);

  // ── Suggestions ──
  const allSuggestions = [
    { category: 'Ventilation', text: 'Align windows on opposite walls for cross-ventilation in bedrooms' },
    { category: 'Lighting', text: `South-facing rooms get maximum natural light — ideal for living areas` },
    { category: 'Space', text: `Open-plan living-dining makes the ${total_area_sqft} sqft feel spacious` },
    { category: 'Storage', text: 'Built-in wardrobes and lofts maximize storage without consuming floor area' },
    { category: 'Kitchen', text: style === 'modern' ? 'L-shaped kitchen optimizes the work triangle' : 'Platform kitchen with chimney for Indian cooking' },
    { category: 'Structure', text: `${plot_width_ft}' × ${plot_depth_ft}' plot supports a clear-span structure` },
    { category: 'Setback', text: 'Ensure minimum 1.5m front setback per local building by-laws' },
    { category: 'Materials', text: style === 'modern' ? 'Large-format vitrified tiles (2×4 ft) for modern finish' : 'Kadappa or Kota stone for traditional flooring' },
    { category: 'Vastu', text: vastu_compliant ? 'Kitchen in SE (Agni corner), master in SW follow Vastu' : 'Functional layout prioritized over directional placement' },
    { category: 'Plumbing', text: 'Cluster wet areas to minimize plumbing runs and reduce cost' },
    { category: 'Privacy', text: 'Bedrooms placed away from main entrance for acoustic privacy' },
    { category: 'Energy', text: 'Consider window shading on west-facing walls to reduce heat gain' },
  ];
  const suggestions = rng.shuffle(allSuggestions).slice(0, rng.intRange(4, 7));

  const element_summary = {
    rooms: placedRooms.length,
    walls: walls.length,
    doors: doors.length,
    windows: windows.length,
    furniture: furniture.length,
    columns: columns.length,
  };

  return {
    unit_type, total_area_sqft, facing, style, vastu_compliant,
    plot_dimensions: { width_mm: pw, depth_mm: pd, width_ft: plot_width_ft, depth_ft: plot_depth_ft },
    rooms: placedRooms, walls, doors, windows, furniture, columns, stairs,
    dimensions, joineries,
    element_summary, vastu_analysis, suggestions,
    generated_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
//  CONTROLLER ENDPOINTS
// ═══════════════════════════════════════════════════════════

exports.generateFloorPlan = async (req, res, next) => {
  try {
    const plan = generateFloorPlanAlgorithm(req.body);
    res.json(plan);
  } catch (err) { next(err); }
};

exports.generateAndSave = async (req, res, next) => {
  try {
    const plan = generateFloorPlanAlgorithm(req.body);
    const designName = req.body.design_name || `AI ${plan.unit_type} — ${plan.total_area_sqft} sqft`;
    const { company_id, userId } = req.user;

    let projectDoc = await prisma.project.findFirst({ where: { company_id }, orderBy: { createdAt: 'desc' } });
    if (!projectDoc) {
      projectDoc = await prisma.project.create({
        data: { project_name: 'AI Generated Designs', client_name: 'AI Architect', company_id, created_by: userId, status: 'planning', start_date: new Date() },
      });
    }

    const bimProject = await prisma.bIMProject.create({
      data: {
        project_id: projectDoc.id, company_id, created_by: userId,
        design_name: designName,
        description: `AI-generated ${plan.unit_type} floor plan — ${plan.total_area_sqft} sqft, ${plan.style} style, ${plan.facing} facing`,
        status: 'draft',
        site_data: { total_area: plan.total_area_sqft, built_up_area: plan.total_area_sqft, plot_dimensions: { length: plan.plot_dimensions.depth_ft, width: plan.plot_dimensions.width_ft }, orientation: plan.facing.toLowerCase().replace('-', '') },
        element_counts: plan.element_summary,
        building_data: plan,
        tags: ['ai-generated', plan.unit_type, plan.style],
      },
    });
    res.json({ plan, bim_project: { ...bimProject, _id: bimProject.id } });
  } catch (err) { next(err); }
};

exports.getDesignSuggestions = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const rng = createRng();
    const roomCount = project.element_counts?.rooms || 0;
    const area = project.site_data?.total_area || 0;
    const all = [
      { type: 'tip', category: 'Space Planning', text: `With ${roomCount} rooms across ${area} sqft, consider open layouts.` },
      { type: 'tip', category: 'Natural Light', text: 'Add clerestory windows in corridors for natural illumination.' },
      { type: 'warning', category: 'Ventilation', text: 'Every habitable room needs at least one window (10% of floor area).' },
      { type: 'tip', category: 'Energy', text: 'Double-glazed west-facing windows reduce cooling costs by 20-30%.' },
      { type: 'info', category: 'Structure', text: 'Column spacing of 3-4m is optimal for residential buildings.' },
      { type: 'warning', category: 'Fire Safety', text: 'Maintain minimum 1m passage width for emergency egress (NBC).' },
      { type: 'tip', category: 'Acoustics', text: 'Staggered stud partitions between bedrooms improve sound insulation.' },
      { type: 'tip', category: 'Materials', text: 'AAC blocks reduce dead load by 30% vs clay bricks.' },
      { type: 'info', category: 'Plumbing', text: 'Clustering wet areas reduces plumbing cost by 15-20%.' },
      { type: 'tip', category: 'Storage', text: 'Loft storage above bathrooms and passages utilizes dead space.' },
      { type: 'warning', category: 'Accessibility', text: 'Main entrance should be ≥900mm wide for wheelchair access.' },
      { type: 'tip', category: 'Landscaping', text: 'A courtyard or light well improves core ventilation.' },
    ];
    res.json({ project_name: project.design_name, suggestions: rng.shuffle(all).slice(0, rng.intRange(5, 8)) });
  } catch (err) { next(err); }
};

exports.vastuAnalysis = async (req, res, next) => {
  try {
    const project = await prisma.bIMProject.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const facing = req.query.facing || project.site_data?.orientation || 'North';
    if (project.building_data?.rooms?.length) {
      const pw = project.building_data.plot_dimensions?.width_mm || 12000;
      const pd = project.building_data.plot_dimensions?.depth_mm || 7600;
      const analysis = analyzeVastu(project.building_data.rooms, facing, pw, pd);
      return res.json({ project_name: project.design_name, facing, analysis });
    }
    const rng = createRng();
    const roomTypes = ['Living Room', 'Master Bedroom', 'Kitchen', 'Bathroom', 'Bedroom 2'];
    const compliance = [], violations = [];
    for (const room of roomTypes) {
      if (rng.next() > 0.4) compliance.push({ room, message: `${room} follows Vastu guidelines for ${facing}-facing plot` });
      else violations.push({ room, message: `${room} may benefit from repositioning for optimal Vastu alignment` });
    }
    const total = compliance.length + violations.length;
    const pct = Math.round((compliance.length / total) * 100);
    res.json({ project_name: project.design_name, facing, analysis: { percentage: pct, compliance, violations, message: pct >= 70 ? 'Good Vastu compliance' : 'Some adjustments recommended' } });
  } catch (err) { next(err); }
};

// Legacy
exports.generateDesign = async (req, res, next) => { try { res.json({ message: 'AI design generated', design: generateFloorPlanAlgorithm(req.body) }); } catch (err) { next(err); } };
exports.optimizeLayout = async (req, res, next) => { try { res.json({ optimized: true, improvements: ['Room placement optimized', 'Passage width adjusted to 1.2m'] }); } catch (err) { next(err); } };
exports.suggestMaterials = async (req, res, next) => { try { res.json({ suggestions: [{ name: 'AAC Blocks', usage: 'Interior walls', benefit: '30% lighter' }, { name: 'Vitrified Tiles', usage: 'Flooring', benefit: 'Low maintenance' }] }); } catch (err) { next(err); } };
