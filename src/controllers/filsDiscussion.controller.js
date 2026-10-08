const FilDiscussion = require('../models/FilDiscussion');
const Message = require('../models/Message');
const Group = require('../models/Group');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const { sameId, isGroupMember, isGroupAdmin, isEventOrganizer } = require('../utils/roles');
const { deleteThread, deleteMessageTree } = require('../utils/cascade');

const AUTHOR_FIELDS = 'firstName lastName avatar';

const threadConflict = () =>
  ApiError.conflict('Un fil de discussion existe déjà pour cette ressource', 'THREAD_EXISTS');

// Le fil d'un groupe est créé avec le groupe ; celui d'un événement est ouvert par un organisateur.
async function create(req, res) {
  const { group: groupId, event: eventId } = req.valid.body;

  if (groupId) {
    const group = await Group.findById(groupId);
    if (!group || (group.type === 'secret' && !isGroupMember(group, req.user))) {
      throw ApiError.notFound('Groupe introuvable');
    }
    if (!isGroupAdmin(group, req.user)) {
      throw ApiError.forbidden('Réservé aux administrateurs du groupe');
    }
  } else {
    const event = await Event.findById(eventId);
    if (!event) throw ApiError.notFound('Événement introuvable');
    if (!isEventOrganizer(event, req.user)) {
      throw ApiError.forbidden("Réservé aux organisateurs de l'événement");
    }
  }

  const link = groupId ? { group: groupId } : { event: eventId };
  if (await FilDiscussion.exists(link)) throw threadConflict();

  let thread;
  try {
    thread = await FilDiscussion.create(link);
  } catch (error) {
    if (error.code === 11000) throw threadConflict();
    throw error;
  }
  res.status(201).json({ data: thread });
}

// Fils des groupes dont je suis membre et des événements auxquels je participe.
async function list(req, res) {
  const { group, event, page, limit } = req.valid.query;
  const me = req.user._id;

  const [groupIds, eventIds] = await Promise.all([
    Group.find({ members: me }).distinct('_id'),
    Event.find({ participants: me }).distinct('_id'),
  ]);
  const and = [{ $or: [{ group: { $in: groupIds } }, { event: { $in: eventIds } }] }];
  if (group) and.push({ group });
  if (event) and.push({ event });

  const { items, pagination } = await paginate(FilDiscussion, { $and: and }, { page, limit });
  res.json({ data: items, pagination });
}

function getOne(req, res) {
  res.json({ data: req.thread });
}

async function remove(req, res) {
  if (!req.threadAccess.canModerate) {
    throw ApiError.forbidden('Réservé aux administrateurs du groupe ou aux organisateurs');
  }
  await deleteThread(req.thread);
  res.status(204).end();
}

// ---------- Messages ----------

async function sendMessages(req, res, filter) {
  const { q, page, limit } = req.valid.query;
  if (q) filter.content = searchRegex(q);
  const { items, pagination } = await paginate(
    Message,
    filter,
    { page, limit },
    { sort: { createdAt: 1 }, populate: { path: 'author', select: AUTHOR_FIELDS } }
  );
  res.json({ data: items, pagination });
}

// Sans recherche : messages de premier niveau. Avec ?q= : recherche dans tout le fil, réponses comprises.
function listMessages(req, res) {
  const filter = { thread: req.thread._id };
  if (!req.valid.query.q) filter.parent = null;
  return sendMessages(req, res, filter);
}

function listReplies(req, res) {
  return sendMessages(req, res, { thread: req.thread._id, parent: req.message._id });
}

async function saveMessage(req, res, parent) {
  const message = await Message.create({
    thread: req.thread._id,
    author: req.user._id,
    content: req.valid.body.content,
    parent,
  });
  await message.populate({ path: 'author', select: AUTHOR_FIELDS });
  res.status(201).json({ data: message });
}

// Nouveau message : dans un groupe, réservé aux administrateurs si les membres ne peuvent pas publier.
function createMessage(req, res) {
  if (!req.threadAccess.canPost) {
    throw ApiError.forbidden('Les membres ne sont pas autorisés à publier dans ce groupe');
  }
  return saveMessage(req, res, null);
}

// Tout membre ou participant peut répondre à un message.
function createReply(req, res) {
  return saveMessage(req, res, req.message._id);
}

async function getMessage(req, res) {
  await req.message.populate({ path: 'author', select: AUTHOR_FIELDS });
  res.json({ data: req.message });
}

async function updateMessage(req, res) {
  const { message } = req;
  if (!sameId(message.author, req.user._id)) {
    throw ApiError.forbidden('Seul son auteur peut modifier un message');
  }
  message.content = req.valid.body.content;
  await message.save();
  await message.populate({ path: 'author', select: AUTHOR_FIELDS });
  res.json({ data: message });
}

async function removeMessage(req, res) {
  const { message } = req;
  if (!sameId(message.author, req.user._id) && !req.threadAccess.canModerate) {
    throw ApiError.forbidden(
      'Seuls son auteur, un administrateur du groupe ou un organisateur peuvent supprimer un message'
    );
  }
  await deleteMessageTree(message._id);
  res.status(204).end();
}

module.exports = {
  create,
  list,
  getOne,
  remove,
  listMessages,
  listReplies,
  createMessage,
  createReply,
  getMessage,
  updateMessage,
  removeMessage,
};
