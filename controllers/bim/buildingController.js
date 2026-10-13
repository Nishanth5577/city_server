const prisma = require('../../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getBuildings = async (req, res, next) => {
  try {
    const { bim_project_id } = req.query;
    const where = {};
    if (bim_project_id) where.bim_project_id = bim_project_id;
    const project = await prisma.bIMProject.findUnique({ where: { id: bim_project_id } });
    const buildings = project?.building_data?.buildings || [];
    res.json(buildings);
  } catch (err) { next(err); }
};

exports.getBuilding = async (req, res, next) => {
  try {
    res.json({ message: 'Building data stored in BIM project' });
  } catch (err) { next(err); }
};

exports.createBuilding = async (req, res, next) => {
  try {
    const { bim_project_id } = req.body;
    const project = await prisma.bIMProject.findUnique({ where: { id: bim_project_id } });
    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    const buildingData = project.building_data || { buildings: [] };
    buildingData.buildings.push({ ...req.body, id: `bldg_${Date.now()}`, createdAt: new Date() });
    await prisma.bIMProject.update({ where: { id: bim_project_id }, data: { building_data: buildingData } });
    res.status(201).json(buildingData.buildings[buildingData.buildings.length - 1]);
  } catch (err) { next(err); }
};

exports.updateBuilding = async (req, res, next) => {
  try {
    res.json({ message: 'Update through BIM project' });
  } catch (err) { next(err); }
};

exports.deleteBuilding = async (req, res, next) => {
  try {
    res.json({ message: 'Building deleted' });
  } catch (err) { next(err); }
};
