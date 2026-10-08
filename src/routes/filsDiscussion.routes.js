const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { loadThread, loadMessage } = require('../middlewares/access');
const { idParams, listQuery } = require('../validators/common');
const v = require('../validators/filsDiscussion.validator');
const ctrl = require('../controllers/filsDiscussion.controller');

const router = Router();
const params = idParams('threadId');
const messageParams = idParams('threadId', 'messageId');

// loadThread réserve l'accès aux membres du groupe ou aux participants de l'événement lié.

router.post('/threads', authenticate, validate({ body: v.create }), ctrl.create);
router.get('/threads', authenticate, validate({ query: v.list }), ctrl.list);
router.get('/threads/:threadId', authenticate, validate({ params }), loadThread, ctrl.getOne);
router.delete('/threads/:threadId', authenticate, validate({ params }), loadThread, ctrl.remove);

// Messages
router.get(
  '/threads/:threadId/messages',
  authenticate,
  validate({ params, query: listQuery }),
  loadThread,
  ctrl.listMessages
);
router.post(
  '/threads/:threadId/messages',
  authenticate,
  validate({ params, body: v.message }),
  loadThread,
  ctrl.createMessage
);
router.get(
  '/threads/:threadId/messages/:messageId',
  authenticate,
  validate({ params: messageParams }),
  loadThread,
  loadMessage,
  ctrl.getMessage
);
router.patch(
  '/threads/:threadId/messages/:messageId',
  authenticate,
  validate({ params: messageParams, body: v.message }),
  loadThread,
  loadMessage,
  ctrl.updateMessage
);
router.delete(
  '/threads/:threadId/messages/:messageId',
  authenticate,
  validate({ params: messageParams }),
  loadThread,
  loadMessage,
  ctrl.removeMessage
);

// Réponses à un message
router.get(
  '/threads/:threadId/messages/:messageId/replies',
  authenticate,
  validate({ params: messageParams, query: listQuery }),
  loadThread,
  loadMessage,
  ctrl.listReplies
);
router.post(
  '/threads/:threadId/messages/:messageId/replies',
  authenticate,
  validate({ params: messageParams, body: v.message }),
  loadThread,
  loadMessage,
  ctrl.createReply
);

module.exports = router;
