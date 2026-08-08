const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

const buildFilterQuery = (filters, allowedFields) => {
  const query = {};
  for (const [key, value] of Object.entries(filters)) {
    if (allowedFields.includes(key) && value !== undefined && value !== '') {
      if (typeof value === 'string' && !key.endsWith('_id') && !key.endsWith('Id')) {
        query[key] = { $regex: value, $options: 'i' };
      } else {
        query[key] = value;
      }
    }
  }
  return query;
};

const calculatePercentage = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

module.exports = { formatDate, paginate, buildFilterQuery, calculatePercentage };
