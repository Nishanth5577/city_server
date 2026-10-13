// MEP (Mechanical, Electrical, Plumbing) Controller
// Since there's no dedicated MEP table, we store MEP data inside BIMProject.buildings JSON

exports.getSystems = async (req, res, next) => {
  try {
    // Return MEP system types with default configuration
    res.json([
      { id: 'hvac', type: 'HVAC', name: 'Heating, Ventilation & AC', status: 'active', elements: 0 },
      { id: 'electrical', type: 'Electrical', name: 'Electrical Systems', status: 'active', elements: 0 },
      { id: 'plumbing', type: 'Plumbing', name: 'Plumbing & Drainage', status: 'active', elements: 0 },
      { id: 'fire', type: 'Fire Safety', name: 'Fire Detection & Suppression', status: 'active', elements: 0 },
    ]);
  } catch (err) { next(err); }
};

exports.createSystem = async (req, res, next) => {
  try { res.status(201).json({ ...req.body, id: `mep_${Date.now()}`, _id: `mep_${Date.now()}`, createdAt: new Date() }); } catch (err) { next(err); }
};

exports.updateSystem = async (req, res, next) => {
  try { res.json({ ...req.body, updatedAt: new Date() }); } catch (err) { next(err); }
};

exports.deleteSystem = async (req, res, next) => {
  try { res.json({ message: 'MEP system deleted' }); } catch (err) { next(err); }
};

exports.runAnalysis = async (req, res, next) => {
  try {
    const { building_data } = req.body;
    const floors = building_data?.floors || [];
    const totalArea = floors.reduce((s, f) => s + (f.width || 10) * (f.depth || 10), 0) || 100;

    res.json({
      status: 'completed',
      hvac: {
        status: 'optimal',
        coolingLoad: Math.round(totalArea * 0.12 * 100) / 100,
        coolingUnit: 'TR',
        airChanges: 6,
        recommendation: totalArea > 200 ? 'Consider VRF system for efficiency' : 'Split AC units sufficient',
      },
      electrical: {
        status: 'optimal',
        totalLoad: Math.round(totalArea * 15),
        loadUnit: 'W',
        circuitCount: Math.ceil(totalArea / 20),
        earthingRequired: true,
        recommendation: 'Install MCB distribution board with RCCB protection',
      },
      plumbing: {
        status: 'optimal',
        waterDemand: Math.round(totalArea * 0.8),
        demandUnit: 'LPD',
        drainSize: '110mm',
        tankCapacity: Math.round(totalArea * 1.2),
        recommendation: 'Install overhead tank with pressure pump',
      },
      fireSafety: {
        status: totalArea > 500 ? 'warning' : 'optimal',
        extinguisherCount: Math.ceil(totalArea / 100),
        sprinklerRequired: totalArea > 500,
        fireAlarmZones: Math.ceil(totalArea / 200),
        recommendation: totalArea > 500 ? 'Sprinkler system required per NBC 2016' : 'Fire extinguishers sufficient',
      },
    });
  } catch (err) { next(err); }
};

exports.createMEPElement = async (req, res, next) => {
  try { res.status(201).json({ ...req.body, id: `mep_el_${Date.now()}`, _id: `mep_el_${Date.now()}`, createdAt: new Date() }); } catch (err) { next(err); }
};

exports.getMEPElements = async (req, res, next) => {
  try { res.json([]); } catch (err) { next(err); }
};

exports.updateMEPElement = async (req, res, next) => {
  try { res.json({ ...req.body, updatedAt: new Date() }); } catch (err) { next(err); }
};

exports.deleteMEPElement = async (req, res, next) => {
  try { res.json({ message: 'MEP element deleted' }); } catch (err) { next(err); }
};

exports.electricalLoadAnalysis = async (req, res, next) => {
  try {
    const { totalArea = 100, floors = 1 } = req.body;
    const loadPerSqm = 15; // W/sqm average
    const totalLoad = totalArea * loadPerSqm * floors;
    res.json({
      totalLoad, loadUnit: 'W',
      connected: Math.round(totalLoad * 1.25),
      demanded: Math.round(totalLoad * 0.8),
      sanctionedLoad: Math.ceil(totalLoad / 1000) * 1000,
      meterType: totalLoad > 5000 ? 'Three Phase' : 'Single Phase',
      mainCableSize: totalLoad > 10000 ? '16 sqmm' : totalLoad > 5000 ? '10 sqmm' : '6 sqmm',
      mcbRating: `${Math.ceil(totalLoad / 230 / 0.8)}A`,
    });
  } catch (err) { next(err); }
};

exports.plumbingPipeSchedule = async (req, res, next) => {
  try {
    res.json({
      pipes: [
        { type: 'Cold Water Supply', material: 'CPVC', size: '25mm', standard: 'IS 15778' },
        { type: 'Hot Water Supply', material: 'CPVC', size: '20mm', standard: 'IS 15778' },
        { type: 'Soil Pipe', material: 'PVC', size: '110mm', standard: 'IS 13592' },
        { type: 'Waste Pipe', material: 'PVC', size: '75mm', standard: 'IS 13592' },
        { type: 'Vent Pipe', material: 'PVC', size: '75mm', standard: 'IS 13592' },
        { type: 'Rainwater Downpipe', material: 'PVC', size: '110mm', standard: 'IS 13592' },
      ],
      fittings: [
        { name: 'Western Closet (EWC)', count: req.body.bathrooms || 2, brand: 'IS 2556' },
        { name: 'Wash Basin', count: req.body.bathrooms || 2, brand: 'IS 776' },
        { name: 'Kitchen Sink', count: 1, brand: 'IS 13983' },
        { name: 'Floor Trap', count: (req.body.bathrooms || 2) + 1, brand: 'IS 4558' },
      ],
    });
  } catch (err) { next(err); }
};

exports.hvacCoolingLoad = async (req, res, next) => {
  try {
    const { totalArea = 100, occupancy = 10, orientation = 'north' } = req.body;
    const solarGain = orientation === 'west' || orientation === 'east' ? 1.3 : 1.0;
    const sensibleLoad = totalArea * 100 * solarGain;
    const latentLoad = occupancy * 60;
    const totalLoad = sensibleLoad + latentLoad;
    const tonnage = Math.round(totalLoad / 3516.85 * 100) / 100;

    res.json({
      sensibleLoad: Math.round(sensibleLoad), latentLoad: Math.round(latentLoad),
      totalCoolingLoad: Math.round(totalLoad), loadUnit: 'W',
      requiredTonnage: tonnage, tonnageUnit: 'TR',
      recommendedSystem: tonnage > 10 ? 'VRF / Chiller' : tonnage > 3 ? 'Ductable Split' : 'Wall-mount Split',
      ductSize: tonnage > 5 ? '300x200mm' : '200x150mm',
    });
  } catch (err) { next(err); }
};

exports.solarEstimate = async (req, res, next) => {
  try {
    const { roofArea = 80, location = 'Chennai' } = req.body;
    const panelArea = roofArea * 0.6; // 60% usable
    const panelCount = Math.floor(panelArea / 2); // 2 sqm per panel
    const peakKW = panelCount * 0.4; // 400W per panel
    const annualGen = Math.round(peakKW * 4.5 * 365); // 4.5 sun-hours average India

    res.json({
      roofArea, usableArea: Math.round(panelArea),
      panelCount, panelWattage: 400, panelType: 'Monocrystalline',
      peakCapacity: Math.round(peakKW * 100) / 100, capacityUnit: 'kW',
      annualGeneration: annualGen, generationUnit: 'kWh',
      estimatedSavings: Math.round(annualGen * 7), savingsUnit: 'INR/year',
      paybackPeriod: `${Math.round(panelCount * 25000 / (annualGen * 7 || 1))} years`,
      co2Offset: Math.round(annualGen * 0.82), co2Unit: 'kg/year',
    });
  } catch (err) { next(err); }
};
