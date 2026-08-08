const ElectricalElement = require('../../models/bim/ElectricalElement');
const PlumbingElement = require('../../models/bim/PlumbingElement');
const HVACElement = require('../../models/bim/HVACElement');
const SolarSystem = require('../../models/bim/SolarSystem');

const MODEL_MAP = {
  electrical: ElectricalElement,
  plumbing: PlumbingElement,
  hvac: HVACElement,
  solar: SolarSystem,
};

// @desc    Create MEP element
// @route   POST /api/bim/mep/:type
exports.createMEPElement = async (req, res) => {
  try {
    const Model = MODEL_MAP[req.params.type];
    if (!Model) return res.status(400).json({ message: `Invalid MEP type: ${req.params.type}` });
    const element = await Model.create({ ...req.body, company_id: req.user.company_id });
    res.status(201).json(element);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get MEP elements for a floor
// @route   GET /api/bim/mep/:type/floor/:floorId
exports.getMEPElements = async (req, res) => {
  try {
    const Model = MODEL_MAP[req.params.type];
    if (!Model) return res.status(400).json({ message: `Invalid MEP type: ${req.params.type}` });
    const query = req.params.type === 'solar'
      ? { bim_project_id: req.params.floorId } // Solar is project-level
      : { floor_id: req.params.floorId };
    const elements = await Model.find(query);
    res.json(elements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update MEP element
// @route   PUT /api/bim/mep/:type/:id
exports.updateMEPElement = async (req, res) => {
  try {
    const Model = MODEL_MAP[req.params.type];
    if (!Model) return res.status(400).json({ message: `Invalid MEP type` });
    const element = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!element) return res.status(404).json({ message: 'Element not found' });
    res.json(element);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete MEP element
// @route   DELETE /api/bim/mep/:type/:id
exports.deleteMEPElement = async (req, res) => {
  try {
    const Model = MODEL_MAP[req.params.type];
    if (!Model) return res.status(400).json({ message: `Invalid MEP type` });
    const element = await Model.findByIdAndDelete(req.params.id);
    if (!element) return res.status(404).json({ message: 'Element not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Electrical load analysis for a floor
// @route   GET /api/bim/mep/analysis/electrical/:floorId
exports.electricalLoadAnalysis = async (req, res) => {
  try {
    const elements = await ElectricalElement.find({ floor_id: req.params.floorId });
    const circuits = {};
    let totalWatts = 0;

    elements.forEach(el => {
      const circuit = el.circuit_number || 'unassigned';
      if (!circuits[circuit]) circuits[circuit] = { elements: [], totalWatts: 0 };
      circuits[circuit].elements.push({ id: el._id, type: el.element_type, wattage: el.wattage });
      circuits[circuit].totalWatts += el.wattage || 0;
      totalWatts += el.wattage || 0;
    });

    // Calculate per circuit
    Object.keys(circuits).forEach(key => {
      const c = circuits[key];
      c.current = c.totalWatts / (230 * 0.85);
      c.cableSize = c.current < 14 ? '1.5 sqmm' : c.current < 19 ? '2.5 sqmm' : c.current < 26 ? '4 sqmm' : c.current < 33 ? '6 sqmm' : '10 sqmm';
      c.mcb = c.current < 8 ? '10A' : c.current < 13 ? '16A' : c.current < 16 ? '20A' : c.current < 20 ? '25A' : '32A';
    });

    const totalCurrent = totalWatts / (230 * 0.85);
    res.json({
      totalElements: elements.length,
      connectedLoad_W: totalWatts,
      connectedLoad_kW: Math.round(totalWatts / 100) / 10,
      demandLoad_kW: Math.round(totalWatts * 0.7 / 100) / 10,
      totalCurrent_A: Math.round(totalCurrent * 10) / 10,
      circuits,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Plumbing pipe schedule for a floor
// @route   GET /api/bim/mep/analysis/plumbing/:floorId
exports.plumbingPipeSchedule = async (req, res) => {
  try {
    const elements = await PlumbingElement.find({ floor_id: req.params.floorId });
    const fixtureUnits = { supply: 0, drain: 0 };
    const fuMap = {
      toilet: { s: 3, d: 4 }, sink: { s: 2, d: 2 }, wash_basin: { s: 1, d: 1 },
      shower: { s: 2, d: 2 }, bathtub: { s: 3, d: 2 },
    };

    elements.forEach(el => {
      const fu = fuMap[el.element_type] || { s: 1, d: 1 };
      fixtureUnits.supply += fu.s;
      fixtureUnits.drain += fu.d;
    });

    const supplyPipe = fixtureUnits.supply < 6 ? 20 : fixtureUnits.supply < 12 ? 25 : fixtureUnits.supply < 25 ? 32 : 40;
    const drainPipe = fixtureUnits.drain < 12 ? 50 : fixtureUnits.drain < 20 ? 75 : fixtureUnits.drain < 100 ? 100 : 150;

    res.json({
      totalFixtures: elements.length,
      fixtureUnits,
      mainSupplyPipe_mm: supplyPipe,
      mainDrainPipe_mm: drainPipe,
      elements: elements.map(e => ({
        id: e._id, type: e.element_type, position: e.position,
        pipe_diameter: e.pipe_diameter, pipe_material: e.pipe_material,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    HVAC cooling load analysis for a floor
// @route   GET /api/bim/mep/analysis/hvac/:floorId
exports.hvacCoolingLoad = async (req, res) => {
  try {
    const elements = await HVACElement.find({ floor_id: req.params.floorId });
    let totalCapacity = 0;
    let totalPower = 0;
    const acUnits = elements.filter(e => e.element_type === 'ac_unit');
    const ducts = elements.filter(e => e.element_type === 'duct');
    const vents = elements.filter(e => e.element_type === 'vent' || e.element_type === 'diffuser');

    acUnits.forEach(ac => {
      totalCapacity += ac.capacity_btu || 0;
      totalPower += ac.power_consumption || 0;
    });

    res.json({
      totalElements: elements.length,
      acUnits: acUnits.length,
      ducts: ducts.length,
      vents: vents.length,
      totalCapacity_BTU: totalCapacity,
      totalTonnage: Math.round(totalCapacity / 12000 * 100) / 100,
      totalPower_kW: Math.round(totalPower / 100) / 10,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Solar generation estimate
// @route   GET /api/bim/mep/analysis/solar/:projectId
exports.solarEstimate = async (req, res) => {
  try {
    const solar = await SolarSystem.findOne({ bim_project_id: req.params.projectId });
    if (!solar) return res.json({ installed: false, message: 'No solar system designed' });

    const psh = 5.5;
    const losses = 0.165;
    const dailyKWh = (solar.total_capacity_kw || 0) * psh * (1 - losses);
    const annualKWh = dailyKWh * 365;
    const annualSavings = annualKWh * 7.5;
    const co2Offset = annualKWh * 0.82;

    res.json({
      installed: true,
      system: {
        panels: solar.num_panels,
        capacity_kWp: solar.total_capacity_kw,
        panel_type: solar.panel_type,
        inverter_kW: solar.inverter_capacity_kw,
      },
      generation: {
        daily_kWh: Math.round(dailyKWh * 10) / 10,
        monthly_kWh: Math.round(dailyKWh * 30),
        annual_kWh: Math.round(annualKWh),
      },
      financial: {
        annual_savings_inr: Math.round(annualSavings),
        payback_years: solar.total_cost ? Math.round(solar.total_cost / annualSavings * 10) / 10 : 0,
        co2_offset_kg: Math.round(co2Offset),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
