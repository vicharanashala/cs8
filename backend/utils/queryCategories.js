const Category = require('../models/Category');
const { QUERY_CATEGORIES } = require('../models/Query');

async function getValidCategoryNames() {
  const cats = await Category.find().select('name').lean();
  if (cats.length > 0) return cats.map((c) => c.name);
  return [...QUERY_CATEGORIES];
}

function normalizeQueryCategory(value, validNames) {
  const cat = String(value || '').toLowerCase().trim();
  if (!cat) return 'other';
  if (validNames.includes(cat)) return cat;
  return 'other';
}

module.exports = { getValidCategoryNames, normalizeQueryCategory };
