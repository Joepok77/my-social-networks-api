const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { idParams, listQuery } = require('../validators/common');
const v = require('../validators/users.validator');
const ctrl = require('../controllers/users.controller');

const router = Router();
const params = idParams('userId');

router.get('/users', authenticate, validate({ query: listQuery }), ctrl.list);
router.get('/users/:userId', authenticate, validate({ params }), ctrl.getOne);
// Modification et suppression : uniquement son propre compte (vérifié dans le contrôleur).
router.patch('/users/:userId', authenticate, validate({ params, body: v.update }), ctrl.update);
router.delete('/users/:userId', authenticate, validate({ params }), ctrl.remove);

module.exports = router;
