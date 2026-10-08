const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  loadEvent,
  loadPoll,
  requireEventParticipant,
  requireEventOrganizer,
} = require('../middlewares/access');
const { Joi, idParams, listQuery, pagination } = require('../validators/common');
const v = require('../validators/sondages.validator');
const ctrl = require('../controllers/sondages.controller');

const router = Router();
const eventParams = idParams('eventId');
const pollParams = idParams('eventId', 'pollId');
const responseParams = idParams('pollId');

// ---------- Sondages d'un événement (créés et gérés par les organisateurs) ----------
router.post(
  '/events/:eventId/polls',
  authenticate,
  validate({ params: eventParams, body: v.create }),
  loadEvent,
  requireEventOrganizer,
  ctrl.create
);
router.get(
  '/events/:eventId/polls',
  authenticate,
  validate({ params: eventParams, query: listQuery }),
  loadEvent,
  requireEventParticipant,
  ctrl.list
);
router.get(
  '/events/:eventId/polls/:pollId',
  authenticate,
  validate({ params: pollParams }),
  loadEvent,
  loadPoll,
  requireEventParticipant,
  ctrl.getOne
);
router.patch(
  '/events/:eventId/polls/:pollId',
  authenticate,
  validate({ params: pollParams, body: v.update }),
  loadEvent,
  loadPoll,
  requireEventOrganizer,
  ctrl.update
);
router.delete(
  '/events/:eventId/polls/:pollId',
  authenticate,
  validate({ params: pollParams }),
  loadEvent,
  loadPoll,
  requireEventOrganizer,
  ctrl.remove
);

// ---------- Réponses (une seule par participant) ----------
router.post(
  '/polls/:pollId/responses',
  authenticate,
  validate({ params: responseParams, body: v.respond }),
  loadPoll,
  requireEventParticipant,
  ctrl.respond
);
router.get(
  '/polls/:pollId/responses/me',
  authenticate,
  validate({ params: responseParams }),
  loadPoll,
  requireEventParticipant,
  ctrl.getMyResponse
);
// Toutes les réponses : réservé aux organisateurs.
router.get(
  '/polls/:pollId/responses',
  authenticate,
  validate({ params: responseParams, query: Joi.object(pagination) }),
  loadPoll,
  requireEventOrganizer,
  ctrl.listResponses
);

module.exports = router;
