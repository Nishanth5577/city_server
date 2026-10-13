const prisma = require('../config/prisma');
const addId = (o) => o ? { ...o, _id: o.id } : o;

exports.getSuppliers = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (req.user.company_id) where.company_id = req.user.company_id;
    if (status) where.status = status;
    if (search) where.OR = [{ company_name: { contains: search, mode: 'insensitive' } }, { contact_person: { contains: search, mode: 'insensitive' } }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.supplier.count({ where }),
    ]);
    res.json({ suppliers: suppliers.map(addId), total, page: parseInt(page), pages: Math.ceil(total / take) });
  } catch (error) { next(error); }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found.' });
    res.json(addId(supplier));
  } catch (error) { next(error); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const body = { ...req.body };
    delete body._id;
    delete body.id;

    // Flatten nested address object to individual fields
    if (body.address && typeof body.address === 'object') {
      body.city = body.address.city || '';
      body.state = body.address.state || '';
      body.zip = body.address.zip || '';
      body.address = body.address.street || '';
    }

    // Convert materials_supplied array to comma-separated string in notes or address
    if (Array.isArray(body.materials_supplied)) {
      const materials = body.materials_supplied.join(', ');
      body.notes = body.notes ? `${body.notes}\nMaterials: ${materials}` : `Materials: ${materials}`;
      delete body.materials_supplied;
    } else if (typeof body.materials_supplied === 'string') {
      const materials = body.materials_supplied;
      if (materials) {
        body.notes = body.notes ? `${body.notes}\nMaterials: ${materials}` : `Materials: ${materials}`;
      }
      delete body.materials_supplied;
    }

    // Ensure rating is a number
    if (body.rating !== undefined) body.rating = Number(body.rating) || 0;

    // Only keep fields that exist in the Prisma schema
    const allowed = ['company_name', 'contact_person', 'phone', 'email', 'address', 'city', 'state', 'zip', 'gst_number', 'rating', 'notes', 'status', 'company_id'];
    const data = { company_id: req.user.company_id };
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(addId(supplier));
  } catch (error) { next(error); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const body = { ...req.body };
    delete body._id;
    delete body.id;
    delete body.company_id;

    // Flatten nested address object
    if (body.address && typeof body.address === 'object') {
      body.city = body.address.city || '';
      body.state = body.address.state || '';
      body.zip = body.address.zip || '';
      body.address = body.address.street || '';
    }

    // Convert materials_supplied
    if (Array.isArray(body.materials_supplied)) {
      const materials = body.materials_supplied.join(', ');
      body.notes = body.notes ? `${body.notes}\nMaterials: ${materials}` : `Materials: ${materials}`;
      delete body.materials_supplied;
    } else if (typeof body.materials_supplied === 'string') {
      const materials = body.materials_supplied;
      if (materials) {
        body.notes = body.notes ? `${body.notes}\nMaterials: ${materials}` : `Materials: ${materials}`;
      }
      delete body.materials_supplied;
    }

    if (body.rating !== undefined) body.rating = Number(body.rating) || 0;

    const allowed = ['company_name', 'contact_person', 'phone', 'email', 'address', 'city', 'state', 'zip', 'gst_number', 'rating', 'notes', 'status'];
    const data = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(addId(supplier));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Supplier not found.' });
    next(error);
  }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supplier deleted.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Supplier not found.' });
    next(error);
  }
};
