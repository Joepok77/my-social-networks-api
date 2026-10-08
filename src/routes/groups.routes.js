const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { loadGroup, requireGroupAccess, requireGroupAdmin } = require('../middlewares/access');
const { idParams, listQuery, userIdBody } = require('../validators/common');
const v = require('../validators/groups.validator');
const ev = require('../validators/events.validator');
const ctrl = require('../controllers/groups.controller');
const events = require('../controllers/events.controller');

const router = Router();
const params = idParams('groupId');
const userParams = idParams('groupId', 'userId');

router.post('/groups', authenticate, validate({ body: v.create }), ctrl.create);
router.get('/groups', authenticate, validate({ query: v.list }), ctrl.list);
router.get(
  '/groups/:groupId',
  authenticate,
  validate({ params }),
  loadGroup,
  requireGroupAccess,
  ctrl.getOne
);
router.patch(
  '/groups/:groupId',
  authenticate,
  validate({ params, body: v.update }),
  loadGroup,
  requireGroupAdmin,
  ctrl.update
);
router.delete(
  '/groups/:groupId',
  authenticate,
  validate({ params }),
  loadGroup,
  requireGroupAdmin,
  ctrl.remove
);

// Membres
router.get(
  '/groups/:groupId/members',
  authenticate,
  validate({ params, query: listQuery }),
  loadGroup,
  requireGroupAccess,
  ctrl.listMembers
);
// Rejoindre soi-même un groupe public, ou ajout par un administrateur (vérifié dans le contrôleur).
router.post(
  '/groups/:groupId/members',
  authenticate,
  validate({ params, body: userIdBody }),
  loadGroup,
  ctrl.addMember
);
// Quitter le groupe, ou retrait par un administrateur (vérifié dans le contrôleur).
router.delete(
  '/groups/:groupId/members/:userId',
  authenticate,
  validate({ params: userParams }),
  loadGroup,
  ctrl.removeMember
);

// Administrateurs
router.post(
  '/groups/:groupId/admins',
  authenticate,
  validate({ params, body: userIdBody }),
  loadGroup,
  requireGroupAdmin,
  ctrl.addAdmin
);
router.delete(
  '/groups/:groupId/admins/:userId',
  authenticate,
  validate({ params: userParams }),
  loadGroup,
  requireGroupAdmin,
  ctrl.removeAdmin
);

// Événements du groupe
router.get(
  '/groups/:groupId/events',
  authenticate,
  validate({ params, query: ev.listInGroup }),
  loadGroup,
  requireGroupAccess,
  events.listInGroup
);
// Administrateur, ou membre si le groupe l'autorise (vérifié dans le contrôleur).
router.post(
  '/groups/:groupId/events',
  authenticate,
  validate({ params, body: ev.createInGroup }),
  loadGroup,
  events.createInGroup
);

module.exports = router;
