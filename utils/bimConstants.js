// ═══════════════════════════════════════════════════════════════
// CITY CONSTRUCTIONS ERP — BIM Module Constants
// ═══════════════════════════════════════════════════════════════

const BIM_ELEMENT_TYPES = {
  WALL: 'wall',
  COLUMN: 'column',
  BEAM: 'beam',
  DOOR: 'door',
  WINDOW: 'window',
  STAIR: 'stair',
  ROOF: 'roof',
  SLAB: 'slab',
  FURNITURE: 'furniture',
  ELECTRICAL: 'electrical',
  PLUMBING: 'plumbing',
  HVAC: 'hvac',
  SOLAR: 'solar',
  LANDSCAPE: 'landscape',
  BALCONY: 'balcony',
  PARKING: 'parking',
  GARDEN: 'garden',
  SWIMMING_POOL: 'swimming_pool',
  TERRACE: 'terrace',
  COMPOUND_WALL: 'compound_wall',
  LIFT: 'lift',
  ESCALATOR: 'escalator',
  EMERGENCY_EXIT: 'emergency_exit',
  FIRE_EXIT: 'fire_exit',
  BASEMENT: 'basement',
  ROAD_ACCESS: 'road_access',
};

const WALL_TYPES = {
  EXTERIOR: 'exterior',
  INTERIOR: 'interior',
  PARTITION: 'partition',
  SHEAR: 'shear',
  RETAINING: 'retaining',
  CURTAIN: 'curtain',
  COMPOUND: 'compound',
};

const COLUMN_SHAPES = {
  RECTANGULAR: 'rectangular',
  CIRCULAR: 'circular',
  L_SHAPED: 'l_shaped',
  T_SHAPED: 't_shaped',
};

const DOOR_TYPES = {
  SINGLE: 'single',
  DOUBLE: 'double',
  SLIDING: 'sliding',
  REVOLVING: 'revolving',
  FOLDING: 'folding',
  FRENCH: 'french',
  POCKET: 'pocket',
  GARAGE: 'garage',
  FIRE: 'fire',
};

const WINDOW_TYPES = {
  CASEMENT: 'casement',
  SLIDING: 'sliding',
  FIXED: 'fixed',
  BAY: 'bay',
  AWNING: 'awning',
  HOPPER: 'hopper',
  SKYLIGHT: 'skylight',
  DORMER: 'dormer',
  LOUVERED: 'louvered',
};

const STAIR_TYPES = {
  STRAIGHT: 'straight',
  L_SHAPED: 'l_shaped',
  U_SHAPED: 'u_shaped',
  SPIRAL: 'spiral',
  CURVED: 'curved',
  WINDER: 'winder',
};

const ROOF_TYPES = {
  FLAT: 'flat',
  GABLE: 'gable',
  HIP: 'hip',
  SHED: 'shed',
  MANSARD: 'mansard',
  GAMBREL: 'gambrel',
  BUTTERFLY: 'butterfly',
};

const ROOM_TYPES = {
  BEDROOM: 'bedroom',
  LIVING_ROOM: 'living_room',
  KITCHEN: 'kitchen',
  BATHROOM: 'bathroom',
  TOILET: 'toilet',
  DINING: 'dining',
  STUDY: 'study',
  OFFICE: 'office',
  CONFERENCE: 'conference',
  LOBBY: 'lobby',
  CORRIDOR: 'corridor',
  STORE: 'store',
  GARAGE: 'garage',
  UTILITY: 'utility',
  LAUNDRY: 'laundry',
  BALCONY: 'balcony',
  TERRACE: 'terrace',
  STAIRCASE: 'staircase',
  LIFT: 'lift',
  MECHANICAL: 'mechanical',
  SERVER_ROOM: 'server_room',
  POOJA: 'pooja',
  PANTRY: 'pantry',
  GYM: 'gym',
};

const MATERIAL_CATEGORIES = {
  CONCRETE: 'concrete',
  STEEL: 'steel',
  BRICK: 'brick',
  GRANITE: 'granite',
  MARBLE: 'marble',
  TILE: 'tile',
  WOOD: 'wood',
  GLASS: 'glass',
  PAINT: 'paint',
  PVC: 'pvc',
  ALUMINIUM: 'aluminium',
  CEMENT: 'cement',
  SAND: 'sand',
  AGGREGATE: 'aggregate',
  PLASTER: 'plaster',
  WATERPROOFING: 'waterproofing',
  INSULATION: 'insulation',
  ROOFING: 'roofing',
  FLOORING: 'flooring',
  CLADDING: 'cladding',
};

const COST_CATEGORIES = {
  MATERIAL: 'material',
  LABOUR: 'labour',
  ELECTRICAL: 'electrical',
  PLUMBING: 'plumbing',
  HVAC: 'hvac',
  SOLAR: 'solar',
  INTERIOR: 'interior',
  EXTERIOR: 'exterior',
  STRUCTURAL: 'structural',
  FINISHING: 'finishing',
  LANDSCAPING: 'landscaping',
  EQUIPMENT: 'equipment',
  OVERHEAD: 'overhead',
  CONTINGENCY: 'contingency',
};

const STRUCTURAL_ELEMENT_TYPES = {
  FOOTING: 'footing',
  PILE: 'pile',
  RAFT: 'raft',
  SLAB: 'slab',
  BEAM: 'beam',
  COLUMN: 'column',
  SHEAR_WALL: 'shear_wall',
  RETAINING_WALL: 'retaining_wall',
  LINTEL: 'lintel',
  TRUSS: 'truss',
};

const ELECTRICAL_ELEMENT_TYPES = {
  SWITCH: 'switch',
  SOCKET: 'socket',
  LIGHT: 'light',
  FAN: 'fan',
  DISTRIBUTION_BOARD: 'distribution_board',
  MAIN_PANEL: 'main_panel',
  GENERATOR: 'generator',
  UPS: 'ups',
  CCTV: 'cctv',
  FIRE_ALARM: 'fire_alarm',
  SMOKE_DETECTOR: 'smoke_detector',
  INTERNET_POINT: 'internet_point',
  TELEPHONE_LINE: 'telephone_line',
  CABLE_TRAY: 'cable_tray',
  CONDUIT: 'conduit',
  WIRE: 'wire',
};

const PLUMBING_ELEMENT_TYPES = {
  WATER_PIPE: 'water_pipe',
  DRAIN_PIPE: 'drain_pipe',
  SEWAGE_PIPE: 'sewage_pipe',
  RAIN_WATER_PIPE: 'rain_water_pipe',
  SINK: 'sink',
  TOILET: 'toilet',
  SHOWER: 'shower',
  BATHTUB: 'bathtub',
  WATER_TANK: 'water_tank',
  PUMP: 'pump',
  SEPTIC_TANK: 'septic_tank',
  VALVE: 'valve',
  WATER_HEATER: 'water_heater',
};

const HVAC_ELEMENT_TYPES = {
  AC_UNIT: 'ac_unit',
  DUCT: 'duct',
  VENT: 'vent',
  EXHAUST_FAN: 'exhaust_fan',
  COOLING_UNIT: 'cooling_unit',
  HEATING_UNIT: 'heating_unit',
  AIR_HANDLER: 'air_handler',
  THERMOSTAT: 'thermostat',
  DIFFUSER: 'diffuser',
};

const FURNITURE_TYPES = {
  BED: 'bed',
  SOFA: 'sofa',
  TABLE: 'table',
  CHAIR: 'chair',
  DESK: 'desk',
  WARDROBE: 'wardrobe',
  BOOKSHELF: 'bookshelf',
  TV_UNIT: 'tv_unit',
  DINING_TABLE: 'dining_table',
  KITCHEN_COUNTER: 'kitchen_counter',
  KITCHEN_CABINET: 'kitchen_cabinet',
  BATHTUB: 'bathtub',
  WASH_BASIN: 'wash_basin',
  TOILET_SEAT: 'toilet_seat',
  SHOWER: 'shower',
};

const APPROVAL_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION_REQUESTED: 'revision_requested',
};

const BIM_LAYERS = {
  ARCHITECTURAL: 'architectural',
  STRUCTURAL: 'structural',
  ELECTRICAL: 'electrical',
  PLUMBING: 'plumbing',
  HVAC: 'hvac',
  FURNITURE: 'furniture',
  LANDSCAPE: 'landscape',
  DIMENSIONS: 'dimensions',
  GRID: 'grid',
  ANNOTATIONS: 'annotations',
};

const FIRE_RATINGS = ['none', '30min', '60min', '90min', '120min', '180min', '240min'];
const ENERGY_RATINGS = ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
const UNITS = {
  LENGTH: ['mm', 'cm', 'm', 'ft', 'in'],
  AREA: ['sqm', 'sqft'],
  VOLUME: ['cum', 'cuft', 'litre'],
  WEIGHT: ['kg', 'ton', 'lb'],
  TEMPERATURE: ['celsius', 'fahrenheit'],
};

module.exports = {
  BIM_ELEMENT_TYPES,
  WALL_TYPES,
  COLUMN_SHAPES,
  DOOR_TYPES,
  WINDOW_TYPES,
  STAIR_TYPES,
  ROOF_TYPES,
  ROOM_TYPES,
  MATERIAL_CATEGORIES,
  COST_CATEGORIES,
  STRUCTURAL_ELEMENT_TYPES,
  ELECTRICAL_ELEMENT_TYPES,
  PLUMBING_ELEMENT_TYPES,
  HVAC_ELEMENT_TYPES,
  FURNITURE_TYPES,
  APPROVAL_STATUSES,
  BIM_LAYERS,
  FIRE_RATINGS,
  ENERGY_RATINGS,
  UNITS,
};
