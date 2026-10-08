const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { purchaseLimiter } = require('../middlewares/rateLimiters');
const {
  loadEvent,
  loadTicketType,
  requireEventOrganizer,
  requireTicketing,
} = require('../middlewares/access');
const { idParams, listQuery } = require('../validators/common');
const v = require('../validators/billetterie.validator');
const ctrl = require('../controllers/billetterie.controller');

const router = Router();
const eventParams = idParams('eventId');
const typeParams = idParams('eventId', 'ticketTypeId');
const ticketParams = idParams('eventId', 'ticketId');

// requireTicketing : la billetterie n'existe que sur un événement public qui l'a activée.

// ---------- Types de billets (gérés par les organisateurs) ----------
router.post(
  '/events/:eventId/ticket-types',
  authenticate,
  validate({ params: eventParams, body: v.createType }),
  loadEvent,
  requireEventOrganizer,
  requireTicketing,
  ctrl.createType
);
// Consultation publique, sans compte : une personne extérieure doit voir les billets en vente.
router.get(
  '/events/:eventId/ticket-types',
  validate({ params: eventParams, query: listQuery }),
  loadEvent,
  requireTicketing,
  ctrl.listTypes
);
router.get(
  '/events/:eventId/ticket-types/:ticketTypeId',
  validate({ params: typeParams }),
  loadEvent,
  loadTicketType,
  requireTicketing,
  ctrl.getType
);
router.patch(
  '/events/:eventId/ticket-types/:ticketTypeId',
  authenticate,
  validate({ params: typeParams, body: v.updateType }),
  loadEvent,
  loadTicketType,
  requireEventOrganizer,
  ctrl.updateType
);
router.delete(
  '/events/:eventId/ticket-types/:ticketTypeId',
  authenticate,
  validate({ params: typeParams }),
  loadEvent,
  loadTicketType,
  requireEventOrganizer,
  ctrl.removeType
);

// ---------- Achat d'un billet par une personne extérieure (sans compte) ----------
router.post(
  '/ticket-types/:ticketTypeId/tickets',
  purchaseLimiter,
  validate({ params: idParams('ticketTypeId'), body: v.purchase }),
  loadTicketType,
  requireTicketing,
  ctrl.purchase
);

// ---------- Billets vendus (données personnelles : réservé aux organisateurs) ----------
router.get(
  '/events/:eventId/tickets',
  authenticate,
  validate({ params: eventParams, query: v.listTickets }),
  loadEvent,
  requireEventOrganizer,
  ctrl.listTickets
);
router.get(
  '/events/:eventId/tickets/:ticketId',
  authenticate,
  validate({ params: ticketParams }),
  loadEvent,
  requireEventOrganizer,
  ctrl.getTicket
);
router.delete(
  '/events/:eventId/tickets/:ticketId',
  authenticate,
  validate({ params: ticketParams }),
  loadEvent,
  requireEventOrganizer,
  ctrl.removeTicket
);

module.exports = router;
