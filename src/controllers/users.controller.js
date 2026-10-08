const User = require('../models/User');
const Group = require('../models/Group');
const Event = require('../models/Event');
const ReponseSondage = require('../models/ReponseSondage');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const { sameId } = require('../utils/roles');
const { emailConflict } = require('./auth.controller');

function assertSelf(req) {
  if (!sameId(req.valid.params.userId, req.user._id)) {
    throw ApiError.forbidden('Vous ne pouvez modifier que votre propre compte');
  }
}

async function list(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = q ? { $or: [{ firstName: searchRegex(q) }, { lastName: searchRegex(q) }] } : {};
  const { items, pagination } = await paginate(
    User,
    filter,
    { page, limit },
    { sort: { lastName: 1, firstName: 1 } }
  );
  res.json({ data: items.map((user) => user.toPublic()), pagination });
}

async function getOne(req, res) {
  const user = await User.findById(req.valid.params.userId);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  // L'email n'est visible que par son propriétaire.
  res.json({ data: sameId(user._id, req.user._id) ? user : user.toPublic() });
}

async function update(req, res) {
  assertSelf(req);
  const { body } = req.valid;
  const { user } = req;

  if (body.email && body.email !== user.email && (await User.exists({ email: body.email }))) {
    throw emailConflict();
  }

  user.set(body);
  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) throw emailConflict();
    throw error;
  }
  res.json({ data: user });
}

async function remove(req, res) {
  assertSelf(req);
  const me = req.user._id;

  // Un groupe garde au moins un administrateur, un événement au moins un organisateur.
  const onlyMe = { $size: 1, $all: [me] };
  const [soleAdmin, soleOrganizer] = await Promise.all([
    Group.exists({ admins: onlyMe }),
    Event.exists({ organizers: onlyMe }),
  ]);
  if (soleAdmin || soleOrganizer) {
    throw ApiError.conflict(
      "Vous êtes le seul administrateur d'un groupe ou le seul organisateur d'un événement : " +
        'transférez ce rôle ou supprimez la ressource avant de supprimer votre compte',
      'LAST_MANAGER'
    );
  }

  await Promise.all([
    Group.updateMany({ members: me }, { $pull: { members: me, admins: me } }),
    Event.updateMany({ participants: me }, { $pull: { participants: me, organizers: me } }),
    ReponseSondage.deleteMany({ user: me }),
  ]);
  await User.deleteOne({ _id: me });
  res.status(204).end();
}

module.exports = { list, getOne, update, remove };
