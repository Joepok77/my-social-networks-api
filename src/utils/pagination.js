// Exécute une recherche paginée et renvoie l'enveloppe commune à toutes les listes.
async function paginate(Model, filter, { page, limit }, { sort = { createdAt: -1 }, populate } = {}) {
  let query = Model.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
  if (populate) query = query.populate(populate);

  const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = { paginate };
