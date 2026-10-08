const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { loadEvent, requireEventAccess, requireEventOrganizer } = require('../middlewares/access');
const { idParams, listQuery, userIdBody } = require('../validators/common');
const v = require('../validators/events.validator');
const ctrl = require('../controllers/events.controller');

const router = Router();
const params = idParams('eventId');
const userParams = idParams('eventId', 'userId');

router.post('/events', authenticate, validate({ body: v.create }), ctrl.create);
router.get('/events', authenticate, validate({ query: v.list }), ctrl.list);
router.get(
  '/events/:eventId',
  authenticate,
  validate({ params }),
  loadEvent,
  requireEventAccess,
  ctrl.getOne
);
router.patch(
  '/events/:eventId',
  authenticate,
  validate({ params, body: v.update }),
  loadEvent,
  requireEventOrganizer,
  ctrl.update
);
router.delete(
  '/events/:eventId',
  authenticate,
  validate({ params }),
  loadEvent,
  requireEventOrganizer,
  ctrl.remove
);

// Liens de partage sur les autres réseaux sociaux (événement d'un groupe public)
router.get(
  '/events/:eventId/share',
  authenticate,
  validate({ params }),
  loadEvent,
  requireEventOrganizer,
  ctrl.share
);

// Participants
router.get(
  '/events/:eventId/participants',
  authenticate,
  validate({ params, query: listQuery }),
  loadEvent,
  requireEventAccess,
  ctrl.listParticipants
);
// S'inscrire soi-même à un événement public, ou ajout par un organisateur (vérifié dans le contrôleur).
router.post(
  '/events/:eventId/participants',
  authenticate,
  validate({ params, body: userIdBody }),
  loadEvent,
  ctrl.addParticipant
);
// Se désinscrire, ou retrait par un organisateur (vérifié dans le contrôleur).
router.delete(
  '/events/:eventId/participants/:userId',
  authenticate,
  validate({ params: userParams }),
  loadEvent,
  ctrl.removeParticipant
);

// Organisateurs
router.post(
  '/events/:eventId/organizers',
  authenticate,
  validate({ params, body: userIdBody }),
  loadEvent,
  requireEventOrganizer,
  ctrl.addOrganizer
);
router.delete(
  '/events/:eventId/organizers/:userId',
  authenticate,
  validate({ params: userParams }),
  loadEvent,
  requireEventOrganizer,
  ctrl.removeOrganizer
);

module.exports = router;
