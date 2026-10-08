// Contrôle d'accès (RBAC) : chargement des ressources et vérification du rôle de l'utilisateur.
// Les rôles sont contextuels : administrateur ou membre d'un groupe, organisateur ou participant d'un événement.
const Group = require('../models/Group');
const Event = require('../models/Event');
const FilDiscussion = require('../models/FilDiscussion');
const Message = require('../models/Message');
const Album = require('../models/Album');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const Sondage = require('../models/Sondage');
const TypeBillet = require('../models/TypeBillet');
const ApiError = require('../utils/ApiError');
const {
  sameId,
  isGroupMember,
  isGroupAdmin,
  isEventParticipant,
  isEventOrganizer,
} = require('../utils/roles');

// ---------- Groupes ----------

async function loadGroup(req, res, next) {
  const group = await Group.findById(req.valid.params.groupId);
  // Pour un non-membre, un groupe secret est indiscernable d'un groupe inexistant.
  if (!group || (group.type === 'secret' && !isGroupMember(group, req.user))) {
    throw ApiError.notFound('Groupe introuvable');
  }
  req.group = group;
  next();
}

// Détail d'un groupe : ouvert à tous s'il est public, réservé aux membres sinon.
function requireGroupAccess(req, res, next) {
  if (req.group.type !== 'public' && !isGroupMember(req.group, req.user)) {
    throw ApiError.forbidden('Réservé aux membres du groupe');
  }
  next();
}

function requireGroupAdmin(req, res, next) {
  if (!isGroupAdmin(req.group, req.user)) {
    throw ApiError.forbidden('Réservé aux administrateurs du groupe');
  }
  next();
}

// ---------- Événements ----------

async function findEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throw ApiError.notFound('Événement introuvable');
  return event;
}

async function loadEvent(req, res, next) {
  req.event = await findEvent(req.valid.params.eventId);
  next();
}

// Détail d'un événement : ouvert à tous s'il est public, réservé aux participants sinon.
function requireEventAccess(req, res, next) {
  if (req.event.visibility !== 'public' && !isEventParticipant(req.event, req.user)) {
    throw ApiError.forbidden("Réservé aux participants de l'événement");
  }
  next();
}

function requireEventParticipant(req, res, next) {
  if (!isEventParticipant(req.event, req.user)) {
    throw ApiError.forbidden("Réservé aux participants de l'événement");
  }
  next();
}

function requireEventOrganizer(req, res, next) {
  if (!isEventOrganizer(req.event, req.user)) {
    throw ApiError.forbidden("Réservé aux organisateurs de l'événement");
  }
  next();
}

// Billetterie : uniquement sur un événement public qui l'a activée.
function requireTicketing(req, res, next) {
  const { event } = req;
  if (event.visibility !== 'public') {
    // Sans authentification, un événement privé n'est pas révélé.
    if (!req.user) throw ApiError.notFound('Événement introuvable');
    throw ApiError.conflict(
      'La billetterie est réservée aux événements publics',
      'TICKETING_REQUIRES_PUBLIC_EVENT'
    );
  }
  if (!event.ticketingEnabled) {
    throw ApiError.conflict(
      "La billetterie n'est pas activée pour cet événement",
      'TICKETING_DISABLED'
    );
  }
  next();
}

// ---------- Ressources rattachées à un événement ----------

// Charge une ressource enfant, vérifie qu'elle appartient bien au parent indiqué dans l'URL,
// puis charge son événement pour les contrôles de rôle.
const loadEventChild = ({ Model, param, key, label, parent }) =>
  async function loadChild(req, res, next) {
    const { params } = req.valid;
    const doc = await Model.findById(params[param]);
    const parentId = parent && params[parent.param];
    if (!doc || (parentId && !sameId(doc[parent.field], parentId))) {
      throw ApiError.notFound(`${label} introuvable`);
    }
    req[key] = doc;
    if (!req.event) req.event = await findEvent(doc.event);
    next();
  };

const loadAlbum = loadEventChild({
  Model: Album,
  param: 'albumId',
  key: 'album',
  label: 'Album',
  parent: { param: 'eventId', field: 'event' },
});

const loadPhoto = loadEventChild({
  Model: Photo,
  param: 'photoId',
  key: 'photo',
  label: 'Photo',
  parent: { param: 'albumId', field: 'album' },
});

const loadComment = loadEventChild({
  Model: Comment,
  param: 'commentId',
  key: 'comment',
  label: 'Commentaire',
  parent: { param: 'photoId', field: 'photo' },
});

const loadPoll = loadEventChild({
  Model: Sondage,
  param: 'pollId',
  key: 'poll',
  label: 'Sondage',
  parent: { param: 'eventId', field: 'event' },
});

const loadTicketType = loadEventChild({
  Model: TypeBillet,
  param: 'ticketTypeId',
  key: 'ticketType',
  label: 'Type de billet',
  parent: { param: 'eventId', field: 'event' },
});

// ---------- Fils de discussion ----------

// Charge le fil et calcule les droits de l'utilisateur selon le groupe ou l'événement lié.
async function loadThread(req, res, next) {
  const thread = await FilDiscussion.findById(req.valid.params.threadId);
  if (!thread) throw ApiError.notFound('Fil de discussion introuvable');

  if (thread.group) {
    const group = await Group.findById(thread.group);
    if (!group || (group.type === 'secret' && !isGroupMember(group, req.user))) {
      throw ApiError.notFound('Fil de discussion introuvable');
    }
    if (!isGroupMember(group, req.user)) throw ApiError.forbidden('Réservé aux membres du groupe');
    const admin = isGroupAdmin(group, req.user);
    req.threadAccess = { canPost: admin || group.allowMembersToPost, canModerate: admin };
  } else {
    const event = await findEvent(thread.event);
    if (!isEventParticipant(event, req.user)) {
      throw ApiError.forbidden("Réservé aux participants de l'événement");
    }
    req.threadAccess = { canPost: true, canModerate: isEventOrganizer(event, req.user) };
  }

  req.thread = thread;
  next();
}

async function loadMessage(req, res, next) {
  const message = await Message.findById(req.valid.params.messageId);
  if (!message || !sameId(message.thread, req.thread._id)) {
    throw ApiError.notFound('Message introuvable');
  }
  req.message = message;
  next();
}

module.exports = {
  loadGroup,
  requireGroupAccess,
  requireGroupAdmin,
  loadEvent,
  requireEventAccess,
  requireEventParticipant,
  requireEventOrganizer,
  requireTicketing,
  loadAlbum,
  loadPhoto,
  loadComment,
  loadPoll,
  loadTicketType,
  loadThread,
  loadMessage,
};
