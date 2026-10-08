const Event = require('../models/Event');
const Group = require('../models/Group');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const {
  sameId,
  includesId,
  uniqueIds,
  isGroupMember,
  isGroupAdmin,
  isEventOrganizer,
} = require('../utils/roles');
const { deleteEvent } = require('../utils/cascade');

const ticketingConflict = () =>
  ApiError.conflict(
    'La billetterie est réservée aux événements publics',
    'TICKETING_REQUIRES_PUBLIC_EVENT'
  );

// Création commune aux événements simples et aux événements de groupe.
async function createEvent({ body, user, group }) {
  const { organizers = [], participants = [], inviteAllMembers = false, ...fields } = body;

  const organizerIds = uniqueIds([user._id, ...organizers]);
  const invited = group && inviteAllMembers ? group.members : [];
  const participantIds = uniqueIds([...organizerIds, ...participants, ...invited]);

  const known = await User.countDocuments({ _id: { $in: participantIds } });
  if (known !== participantIds.length) {
    throw ApiError.badRequest('Un ou plusieurs utilisateurs sont introuvables');
  }
  if (fields.ticketingEnabled && fields.visibility === 'private') throw ticketingConflict();

  return Event.create({
    ...fields,
    organizers: organizerIds,
    participants: participantIds,
    group: group ? group._id : null,
    createdBy: user._id,
  });
}

async function create(req, res) {
  const event = await createEvent({ body: req.valid.body, user: req.user });
  res.status(201).json({ data: event });
}

async function createInGroup(req, res) {
  const { group, user } = req;
  const allowed =
    isGroupAdmin(group, user) || (isGroupMember(group, user) && group.allowMembersToCreateEvents);
  if (!allowed) {
    throw ApiError.forbidden("Vous n'êtes pas autorisé à créer un événement dans ce groupe");
  }
  const event = await createEvent({ body: req.valid.body, user, group });
  res.status(201).json({ data: event });
}

// Un événement privé n'apparaît que pour ses participants.
function buildFilter(query, user, extra) {
  const { q, visibility, group, from, to, mine } = query;
  const and = [{ $or: [{ visibility: 'public' }, { participants: user._id }] }];
  if (extra) and.push(extra);
  if (q) {
    const regex = searchRegex(q);
    and.push({ $or: [{ name: regex }, { description: regex }, { location: regex }] });
  }
  if (visibility) and.push({ visibility });
  if (group) and.push({ group });
  if (from) and.push({ endDate: { $gte: from } });
  if (to) and.push({ startDate: { $lte: to } });
  if (mine) and.push({ participants: user._id });
  return { $and: and };
}

async function sendList(req, res, extra) {
  const { page, limit } = req.valid.query;
  const { items, pagination } = await paginate(
    Event,
    buildFilter(req.valid.query, req.user, extra),
    { page, limit },
    { sort: { startDate: 1 } }
  );
  res.json({ data: items, pagination });
}

const list = (req, res) => sendList(req, res);

const listInGroup = (req, res) => sendList(req, res, { group: req.group._id });

function getOne(req, res) {
  res.json({ data: req.event });
}

async function update(req, res) {
  const { event } = req;
  event.set(req.valid.body);
  if (event.ticketingEnabled && event.visibility !== 'public') throw ticketingConflict();
  await event.save();
  res.json({ data: event });
}

async function remove(req, res) {
  await deleteEvent(req.event);
  res.status(204).end();
}

// Partage sur les autres réseaux sociaux : URL de l'événement et liens de partage préremplis.
async function share(req, res) {
  const { event } = req;
  const group = event.group ? await Group.findById(event.group) : null;
  if (!group || group.type !== 'public') {
    throw ApiError.conflict(
      "Le partage sur les réseaux sociaux est réservé aux événements d'un groupe public",
      'SHARING_NOT_AVAILABLE'
    );
  }

  const url = `${env.publicAppUrl}/events/${event.id}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(event.name);
  res.json({
    data: {
      url,
      title: event.name,
      links: {
        x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${event.name} ${url}`)}`,
      },
    },
  });
}

async function listParticipants(req, res) {
  const { q, page, limit } = req.valid.query;
  const { event } = req;

  const filter = { _id: { $in: event.participants } };
  if (q) filter.$or = [{ firstName: searchRegex(q) }, { lastName: searchRegex(q) }];

  const { items, pagination } = await paginate(
    User,
    filter,
    { page, limit },
    { sort: { lastName: 1, firstName: 1 } }
  );
  const data = items.map((user) => ({
    ...user.toPublic(),
    role: isEventOrganizer(event, user) ? 'organizer' : 'participant',
  }));
  res.json({ data, pagination });
}

async function addParticipant(req, res) {
  const { event, user } = req;
  const { userId } = req.valid.body;

  // On s'inscrit soi-même à un événement public ; sinon c'est un organisateur qui ajoute le participant.
  const selfJoin = sameId(userId, user._id) && event.visibility === 'public';
  if (!selfJoin && !isEventOrganizer(event, user)) {
    throw ApiError.forbidden('Seul un organisateur peut ajouter un participant à cet événement');
  }
  if (includesId(event.participants, userId)) {
    throw ApiError.conflict('Cet utilisateur participe déjà à cet événement', 'ALREADY_PARTICIPANT');
  }
  if (!(await User.exists({ _id: userId }))) throw ApiError.notFound('Utilisateur introuvable');

  event.participants.push(userId);
  await event.save();
  res.status(201).json({ data: event });
}

async function removeParticipant(req, res) {
  const { event, user } = req;
  const { userId } = req.valid.params;

  // On se désinscrit soi-même ; sinon c'est un organisateur qui retire le participant.
  if (!sameId(userId, user._id) && !isEventOrganizer(event, user)) {
    throw ApiError.forbidden('Seul un organisateur peut retirer un participant de cet événement');
  }
  if (!includesId(event.participants, userId)) {
    throw ApiError.notFound("Cet utilisateur ne participe pas à l'événement");
  }
  if (includesId(event.organizers, userId) && event.organizers.length === 1) {
    throw ApiError.conflict(
      'Un événement doit conserver au moins un organisateur',
      'LAST_ORGANIZER'
    );
  }

  event.participants.pull(userId);
  event.organizers.pull(userId);
  await event.save();
  res.status(204).end();
}

async function addOrganizer(req, res) {
  const { event } = req;
  const { userId } = req.valid.body;

  if (includesId(event.organizers, userId)) {
    throw ApiError.conflict(
      'Cet utilisateur est déjà organisateur de cet événement',
      'ALREADY_ORGANIZER'
    );
  }
  if (!(await User.exists({ _id: userId }))) throw ApiError.notFound('Utilisateur introuvable');

  event.organizers.push(userId);
  event.participants.addToSet(userId);
  await event.save();
  res.status(201).json({ data: event });
}

async function removeOrganizer(req, res) {
  const { event } = req;
  const { userId } = req.valid.params;

  if (!includesId(event.organizers, userId)) {
    throw ApiError.notFound("Cet utilisateur n'est pas organisateur de l'événement");
  }
  if (event.organizers.length === 1) {
    throw ApiError.conflict(
      'Un événement doit conserver au moins un organisateur',
      'LAST_ORGANIZER'
    );
  }

  // L'ancien organisateur reste participant.
  event.organizers.pull(userId);
  await event.save();
  res.status(204).end();
}

module.exports = {
  create,
  createInGroup,
  list,
  listInGroup,
  getOne,
  update,
  remove,
  share,
  listParticipants,
  addParticipant,
  removeParticipant,
  addOrganizer,
  removeOrganizer,
};
