const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiters');
const v = require('../validators/users.validator');
const ctrl = require('../controllers/auth.controller');

const router = Router();

router.post('/auth/register', authLimiter, validate({ body: v.register }), ctrl.register);
router.post('/auth/login', authLimiter, validate({ body: v.login }), ctrl.login);
router.get('/auth/me', authenticate, ctrl.me);

module.exports = router;
