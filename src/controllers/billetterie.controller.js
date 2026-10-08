const TypeBillet = require('../models/TypeBillet');
const Billet = require('../models/Billet');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const { sameId } = require('../utils/roles');

const alreadyOwned = () =>
  ApiError.conflict(
    'Un billet a déjà été obtenu avec cette adresse email pour cet événement',
    'TICKET_ALREADY_OWNED'
  );

// ---------- Types de billets ----------

async function createType(req, res) {
  const ticketType = await TypeBillet.create({ ...req.valid.body, event: req.event._id });
  res.status(201).json({ data: ticketType });
}

async function listTypes(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = { event: req.event._id };
  if (q) filter.name = searchRegex(q);
  const { items, pagination } = await paginate(
    TypeBillet,
    filter,
    { page, limit },
    { sort: { amount: 1 } }
  );
  res.json({ data: items, pagination });
}

function getType(req, res) {
  res.json({ data: req.ticketType });
}

async function updateType(req, res) {
  const { ticketType } = req;
  const { body } = req.valid;
  if (body.quantity !== undefined && body.quantity < ticketType.sold) {
    throw ApiError.conflict(
      `La quantité ne peut pas être inférieure au nombre de billets déjà vendus (${ticketType.sold})`,
      'QUANTITY_BELOW_SOLD'
    );
  }
  // Mise à jour ciblée : ne touche pas au compteur `sold`, modifié en parallèle par les achats.
  const updated = await TypeBillet.findOneAndUpdate(
    { _id: ticketType._id, sold: { $lte: body.quantity ?? ticketType.quantity } },
    { $set: body },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updated) {
    throw ApiError.conflict(
      'Des billets ont été vendus entre-temps : la quantité demandée est trop basse',
      'QUANTITY_BELOW_SOLD'
    );
  }
  res.json({ data: updated });
}

async function removeType(req, res) {
  if (await Billet.exists({ ticketType: req.ticketType._id })) {
    throw ApiError.conflict(
      'Ce type de billet ne peut pas être supprimé : des billets ont déjà été vendus',
      'TICKET_TYPE_HAS_TICKETS'
    );
  }
  await req.ticketType.deleteOne();
  res.status(204).end();
}

// ---------- Billets ----------

// Achat par une personne extérieure (sans compte) : un seul billet par email et par événement.
async function purchase(req, res) {
  const { ticketType, event } = req;
  const { body } = req.valid;

  if (await Billet.exists({ event: event._id, email: body.email })) throw alreadyOwned();

  // Réservation atomique d'une place : le compteur n'est incrémenté que s'il reste du stock.
  // Deux achats simultanés ne peuvent donc jamais dépasser la quantité limitée.
  const reserved = await TypeBillet.findOneAndUpdate(
    { _id: ticketType._id, $expr: { $lt: ['$sold', '$quantity'] } },
    { $inc: { sold: 1 } },
    { returnDocument: 'after' }
  );
  if (!reserved) {
    throw ApiError.conflict('Il ne reste plus de billets de ce type', 'SOLD_OUT');
  }

  try {
    const ticket = await Billet.create({ ...body, ticketType: ticketType._id, event: event._id });
    res.status(201).json({ data: ticket });
  } catch (error) {
    // Le billet n'a pas été créé : on rend la place réservée.
    await TypeBillet.updateOne({ _id: ticketType._id }, { $inc: { sold: -1 } });
    // Deux achats simultanés avec le même email : l'index unique (événement, email) tranche.
    if (error.code === 11000) throw alreadyOwned();
    throw error;
  }
}

async function listTickets(req, res) {
  const { q, ticketType, page, limit } = req.valid.query;
  const filter = { event: req.event._id };
  if (ticketType) filter.ticketType = ticketType;
  if (q) {
    const regex = searchRegex(q);
    filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
  }
  const { items, pagination } = await paginate(
    Billet,
    filter,
    { page, limit },
    { sort: { purchasedAt: -1 }, populate: { path: 'ticketType', select: 'name amount' } }
  );
  res.json({ data: items, pagination });
}

async function findTicket(req) {
  const ticket = await Billet.findById(req.valid.params.ticketId);
  if (!ticket || !sameId(ticket.event, req.event._id)) throw ApiError.notFound('Billet introuvable');
  return ticket;
}

async function getTicket(req, res) {
  const ticket = await findTicket(req);
  await ticket.populate({ path: 'ticketType', select: 'name amount' });
  res.json({ data: ticket });
}

// Annulation par un organisateur : la place est remise en vente.
async function removeTicket(req, res) {
  const ticket = await findTicket(req);
  await ticket.deleteOne();
  await TypeBillet.updateOne({ _id: ticket.ticketType, sold: { $gt: 0 } }, { $inc: { sold: -1 } });
  res.status(204).end();
}

module.exports = {
  createType,
  listTypes,
  getType,
  updateType,
  removeType,
  purchase,
  listTickets,
  getTicket,
  removeTicket,
};
