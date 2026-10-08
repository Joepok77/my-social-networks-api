const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');

// Comparé quand l'email est inconnu, pour que le temps de réponse ne révèle pas l'existence d'un compte.
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', User.BCRYPT_ROUNDS);

const emailConflict = () =>
  ApiError.conflict('Cette adresse email est déjà utilisée', 'EMAIL_ALREADY_USED');

async function register(req, res) {
  const { body } = req.valid;
  if (await User.exists({ email: body.email })) throw emailConflict();

  let user;
  try {
    user = await User.create(body);
  } catch (error) {
    // Deux inscriptions simultanées : l'index unique tranche.
    if (error.code === 11000) throw emailConflict();
    throw error;
  }

  res.status(201).json({ data: { user, token: signToken(user.id) } });
}

async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+password');
  const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

  // Même message que l'email ou le mot de passe soit faux.
  if (!user || !passwordOk) {
    throw ApiError.unauthorized('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS');
  }

  res.json({ data: { user, token: signToken(user.id) } });
}

function me(req, res) {
  res.json({ data: req.user });
}

module.exports = { register, login, me, emailConflict };
