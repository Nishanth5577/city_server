/**
 * Mongoose-to-Prisma compatibility layer for BIM models.
 * Wraps Prisma calls to match Mongoose API patterns used in BIM controllers.
 */
const prisma = require('./prisma');

function createModelProxy(modelName) {
  const model = prisma[modelName];
  if (!model) {
    console.warn(`⚠️ Prisma model "${modelName}" not found, returning stub`);
    return createStubModel(modelName);
  }

  return {
    // find(filter) -> findMany
    find: (filter = {}) => {
      const chain = createChain(model, 'findMany', convertFilter(filter));
      return chain;
    },

    // findById(id) -> findUnique
    findById: (id) => {
      const chain = createChain(model, 'findUnique', { where: { id } });
      return chain;
    },

    // findOne(filter) -> findFirst
    findOne: (filter = {}) => {
      const chain = createChain(model, 'findFirst', convertFilter(filter));
      return chain;
    },

    // create(data) or create([...]) -> create/createMany
    create: async (data) => {
      if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
          results.push(await model.create({ data: cleanData(item) }));
        }
        return results.map(addCompat);
      }
      const result = await model.create({ data: cleanData(data) });
      return addCompat(result);
    },

    // countDocuments(filter) -> count
    countDocuments: async (filter = {}) => {
      return model.count({ where: convertWhere(filter) });
    },

    // findByIdAndUpdate(id, data, opts) -> update
    findByIdAndUpdate: async (id, data, opts = {}) => {
      try {
        const result = await model.update({ where: { id }, data: cleanData(data) });
        return addCompat(result);
      } catch (e) {
        if (e.code === 'P2025') return null;
        throw e;
      }
    },

    // findByIdAndDelete(id) -> delete
    findByIdAndDelete: async (id) => {
      try {
        const result = await model.delete({ where: { id } });
        return addCompat(result);
      } catch (e) {
        if (e.code === 'P2025') return null;
        throw e;
      }
    },

    // deleteMany(filter) -> deleteMany
    deleteMany: async (filter = {}) => {
      return model.deleteMany({ where: convertWhere(filter) });
    },

    // insertMany(data) -> createMany
    insertMany: async (data) => {
      return model.createMany({ data: data.map(cleanData) });
    },

    // updateMany(filter, update) -> updateMany
    updateMany: async (filter, update) => {
      const data = cleanData(update.$set || update);
      return model.updateMany({ where: convertWhere(filter), data });
    },

    // aggregate -> simplified
    aggregate: async (pipeline) => {
      // Return empty for complex aggregations - dashboard uses Prisma directly
      console.warn(`⚠️ aggregate() called on ${modelName} - use Prisma directly`);
      return [];
    },
  };
}

// Chain builder for populate/sort/skip/limit
function createChain(model, method, baseArgs) {
  const chain = {
    _includes: {},
    _orderBy: undefined,
    _skip: undefined,
    _take: undefined,
    _select: undefined,

    populate(field, select) {
      // Simplified: just mark for include
      if (typeof field === 'string') {
        chain._includes[field] = select ? { select: parseSelect(select) } : true;
      } else if (typeof field === 'object' && field.path) {
        chain._includes[field.path] = true;
      }
      return chain;
    },

    select(fields) {
      if (typeof fields === 'string') {
        chain._select = {};
        fields.split(' ').forEach(f => {
          if (!f.startsWith('-') && !f.startsWith('+')) chain._select[f] = true;
        });
        chain._select.id = true;
      }
      return chain;
    },

    sort(sortObj) {
      if (typeof sortObj === 'object') {
        const entries = Object.entries(sortObj);
        if (entries.length > 0) {
          chain._orderBy = {};
          chain._orderBy[entries[0][0]] = entries[0][1] === -1 ? 'desc' : 'asc';
        }
      }
      return chain;
    },

    skip(n) { chain._skip = n; return chain; },
    limit(n) { chain._take = parseInt(n); return chain; },

    async then(resolve, reject) {
      try {
        const args = { ...baseArgs };
        if (Object.keys(chain._includes).length > 0) args.include = chain._includes;
        if (chain._orderBy) args.orderBy = chain._orderBy;
        if (chain._skip !== undefined) args.skip = chain._skip;
        if (chain._take !== undefined) args.take = chain._take;
        if (chain._select) args.select = chain._select;

        const result = await model[method](args);
        if (Array.isArray(result)) {
          resolve(result.map(addCompat));
        } else {
          resolve(result ? addCompat(result) : null);
        }
      } catch (err) {
        if (reject) reject(err);
        else throw err;
      }
    },
  };

  return chain;
}

// Convert Mongoose filter to Prisma where
function convertWhere(filter) {
  if (!filter || Object.keys(filter).length === 0) return {};
  const where = {};
  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or') {
      where.OR = val.map(convertWhere);
    } else if (key === '$and') {
      where.AND = val.map(convertWhere);
    } else if (key === '$in') {
      // should not happen at top level
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
      if (val.$regex) {
        where[key] = { contains: val.$regex, mode: 'insensitive' };
      } else if (val.$in) {
        where[key] = { in: val.$in };
      } else if (val.$ne) {
        where[key] = { not: val.$ne };
      } else if (val.$gt || val.$gte || val.$lt || val.$lte) {
        where[key] = {};
        if (val.$gt) where[key].gt = val.$gt;
        if (val.$gte) where[key].gte = val.$gte;
        if (val.$lt) where[key].lt = val.$lt;
        if (val.$lte) where[key].lte = val.$lte;
      } else {
        where[key] = val;
      }
    } else {
      where[key] = val;
    }
  }
  return where;
}

function convertFilter(filter) {
  return { where: convertWhere(filter) };
}

function parseSelect(selectStr) {
  const sel = {};
  selectStr.split(' ').forEach(f => { if (f && !f.startsWith('-')) sel[f] = true; });
  sel.id = true;
  return sel;
}

function cleanData(data) {
  if (!data) return data;
  const clean = { ...data };
  delete clean._id;
  delete clean.__v;
  // Remove Mongoose operators
  delete clean.$set;
  delete clean.$inc;
  delete clean.$push;
  return clean;
}

function addCompat(obj) {
  if (!obj) return obj;
  const result = { ...obj, _id: obj.id };
  result.toObject = () => result;
  result.toJSON = () => result;
  result.save = async () => {
    // No-op for compat - updates should use Prisma directly
    return result;
  };
  result.deleteOne = async () => {
    // No-op
  };
  result.markModified = () => {};
  return result;
}

function createStubModel(name) {
  const stub = () => ({ then: (r) => r([]) });
  return { find: stub, findById: stub, findOne: stub, create: async () => ({}), countDocuments: async () => 0, findByIdAndUpdate: async () => null, findByIdAndDelete: async () => null, deleteMany: async () => ({}), insertMany: async () => ({}), updateMany: async () => ({}), aggregate: async () => [] };
}

module.exports = { createModelProxy };
