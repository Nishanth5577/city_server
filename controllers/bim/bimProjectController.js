const BIMProject = require('../../models/bim/BIMProject');
const BIMBuilding = require('../../models/bim/Building');
const BIMFloor = require('../../models/bim/Floor');
const Project = require('../../models/Project');

// @desc    Get all BIM projects for user's company
// @route   GET /api/bim/projects
exports.getProjects = async (req, res, next) => {
  try {
    const { company_id } = req.user;
    const { project_id, status, page = 1, limit = 20 } = req.query;
    const filter = { company_id };
    if (project_id) filter.project_id = project_id;
    if (status) filter.status = status;

    const projects = await BIMProject.find(filter)
      .populate('project_id', 'project_name project_id client_name')
      .populate('created_by', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await BIMProject.countDocuments(filter);
    res.json({ projects, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// @desc    Get single BIM project with full data
// @route   GET /api/bim/projects/:id
exports.getProject = async (req, res, next) => {
  try {
    const project = await BIMProject.findById(req.params.id)
      .populate('project_id', 'project_name project_id client_name contract_value budget')
      .populate('created_by', 'name email')
      .populate('collaborators.user_id', 'name email')
      .populate({
        path: 'buildings',
        populate: { path: 'floors', populate: 'rooms' }
      });

    if (!project) return res.status(404).json({ message: 'BIM project not found' });
    res.json(project);
  } catch (err) { next(err); }
};

// @desc    Create BIM project
// @route   POST /api/bim/projects
exports.createProject = async (req, res, next) => {
  try {
    const { company_id, userId } = req.user;
    const { project_id, design_name, description, site_data, coordinate_system, buildings_config } = req.body;

    // Verify ERP project exists
    if (project_id) {
      const erpProject = await Project.findById(project_id);
      if (!erpProject) return res.status(400).json({ message: 'ERP Project not found' });
    }

    const bimProject = await BIMProject.create({
      project_id: project_id || null,
      company_id,
      created_by: userId,
      design_name,
      description,
      site_data,
      coordinate_system,
      collaborators: [{ user_id: userId, role: 'owner' }],
    });

    // Auto-create building and floors if config provided
    if (buildings_config) {
      const { name, building_type, num_floors, floor_height } = buildings_config;
      const building = await BIMBuilding.create({
        bim_project_id: bimProject._id,
        company_id,
        name: name || 'Building A',
        building_type: building_type || 'residential',
        num_floors: num_floors || 1,
        floor_height: floor_height || 3000,
        total_height: (num_floors || 1) * (floor_height || 3000),
      });

      const floors = [];
      for (let i = 0; i < (num_floors || 1); i++) {
        const floor = await BIMFloor.create({
          building_id: building._id,
          bim_project_id: bimProject._id,
          company_id,
          floor_number: i,
          floor_name: i === 0 ? 'Ground Floor' : `Floor ${i}`,
          level_height: floor_height || 3000,
          floor_type: i === 0 ? 'ground' : 'typical',
        });
        floors.push(floor._id);
      }

      building.floors = floors;
      await building.save();
      bimProject.buildings = [building._id];
      await bimProject.save();
    }

    const populated = await BIMProject.findById(bimProject._id)
      .populate('project_id', 'project_name project_id client_name')
      .populate('created_by', 'name email')
      .populate({ path: 'buildings', populate: 'floors' });

    // Emit via socket
    if (global.io) {
      global.io.to(`company_${company_id}`).emit('bim:project_created', populated);
    }

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// @desc    Update BIM project
// @route   PUT /api/bim/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const project = await BIMProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'BIM project not found' });

    const updates = req.body;
    const allowed = ['design_name', 'description', 'status', 'site_data', 'canvas_settings', 'layer_visibility', 'grid_spacing', 'snap_enabled', 'tags', 'thumbnail'];
    allowed.forEach(field => { if (updates[field] !== undefined) project[field] = updates[field]; });

    project.version += 1;
    await project.save();

    if (global.io) {
      global.io.to(`bim_${project._id}`).emit('bim:project_updated', project);
    }

    res.json(project);
  } catch (err) { next(err); }
};

// @desc    Delete BIM project
// @route   DELETE /api/bim/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await BIMProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'BIM project not found' });

    // Cascade delete buildings, floors, elements
    const buildings = await BIMBuilding.find({ bim_project_id: project._id });
    for (const building of buildings) {
      await BIMFloor.deleteMany({ building_id: building._id });
    }
    await BIMBuilding.deleteMany({ bim_project_id: project._id });
    await project.deleteOne();

    res.json({ message: 'BIM project deleted successfully' });
  } catch (err) { next(err); }
};

// @desc    Add collaborator
// @route   POST /api/bim/projects/:id/collaborators
exports.addCollaborator = async (req, res, next) => {
  try {
    const project = await BIMProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'BIM project not found' });

    const { user_id, role } = req.body;
    const exists = project.collaborators.find(c => c.user_id.toString() === user_id);
    if (exists) return res.status(400).json({ message: 'User is already a collaborator' });

    project.collaborators.push({ user_id, role: role || 'viewer' });
    await project.save();

    res.json(project);
  } catch (err) { next(err); }
};
