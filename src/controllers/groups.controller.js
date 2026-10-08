const Group = require('../models/Group');
const User = require('../models/User');
const FilDiscussion = require('../models/FilDiscussion');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const { sameId, includesId, isGroupMember, isGroupAdmin } = require('../utils/roles');
const { deleteGroup } = require('../utils/cascade');

// Un non-membre ne voit d'un groupe privé qu'un résumé, sans la liste des membres ni les réglages.
function serialize(group, user) {
  const json = { ...group.toJSON(), membersCount: group.members.length };
  if (group.type === 'public' || isGroupMember(group, user)) return json;
  const { id, name, description, icon, coverPhoto, type, membersCount } = json;
  return { id, name, description, icon, coverPhoto, type, membersCount };
}

async function create(req, res) {
  const me = req.user._id;
  const group = await Group.create({
    ...req.valid.body,
    admins: [me],
    members: [me],
    createdBy: me,
  });
  // Chaque groupe dispose d'un fil de discussion dès sa création.
  await FilDiscussion.create({ group: group._id });
  res.status(201).json({ data: serialize(group, req.user) });
}

async function list(req, res) {
  const { q, type, mine, page, limit } = req.valid.query;
  const me = req.user._id;

  // Les groupes secrets n'apparaissent que pour leurs membres.
  const and = [{ $or: [{ type: { $in: ['public', 'private'] } }, { members: me }] }];
  if (q) and.push({ $or: [{ name: searchRegex(q) }, { description: searchRegex(q) }] });
  if (type) and.push({ type });
  if (mine) and.push({ members: me });

  const { items, pagination } = await paginate(
    Group,
    { $and: and },
    { page, limit },
    { sort: { name: 1 } }
  );
  res.json({ data: items.map((group) => serialize(group, req.user)), pagination });
}

function getOne(req, res) {
  res.json({ data: serialize(req.group, req.user) });
}

async function update(req, res) {
  req.group.set(req.valid.body);
  await req.group.save();
  res.json({ data: serialize(req.group, req.user) });
}

async function remove(req, res) {
  await deleteGroup(req.group);
  res.status(204).end();
}

async function listMembers(req, res) {
  const { q, page, limit } = req.valid.query;
  const { group } = req;

  const filter = { _id: { $in: group.members } };
  if (q) filter.$or = [{ firstName: searchRegex(q) }, { lastName: searchRegex(q) }];

  const { items, pagination } = await paginate(
    User,
    filter,
    { page, limit },
    { sort: { lastName: 1, firstName: 1 } }
  );
  const data = items.map((user) => ({
    ...user.toPublic(),
    role: isGroupAdmin(group, user) ? 'admin' : 'member',
  }));
  res.json({ data, pagination });
}

async function addMember(req, res) {
  const { group, user } = req;
  const { userId } = req.valid.body;

  // On rejoint soi-même un groupe public ; sinon c'est un administrateur qui ajoute le membre.
  const selfJoin = sameId(userId, user._id) && group.type === 'public';
  if (!selfJoin && !isGroupAdmin(group, user)) {
    throw ApiError.forbidden('Seul un administrateur peut ajouter un membre à ce groupe');
  }
  if (includesId(group.members, userId)) {
    throw ApiError.conflict('Cet utilisateur est déjà membre du groupe', 'ALREADY_MEMBER');
  }
  if (!(await User.exists({ _id: userId }))) throw ApiError.notFound('Utilisateur introuvable');

  group.members.push(userId);
  await group.save();
  res.status(201).json({ data: serialize(group, user) });
}

async function removeMember(req, res) {
  const { group, user } = req;
  const { userId } = req.valid.params;

  // On quitte soi-même un groupe ; sinon c'est un administrateur qui retire le membre.
  if (!sameId(userId, user._id) && !isGroupAdmin(group, user)) {
    throw ApiError.forbidden('Seul un administrateur peut retirer un membre de ce groupe');
  }
  if (!includesId(group.members, userId)) {
    throw ApiError.notFound("Cet utilisateur n'est pas membre du groupe");
  }
  if (includesId(group.admins, userId) && group.admins.length === 1) {
    throw ApiError.conflict('Un groupe doit conserver au moins un administrateur', 'LAST_ADMIN');
  }

  group.members.pull(userId);
  group.admins.pull(userId);
  await group.save();
  res.status(204).end();
}

async function addAdmin(req, res) {
  const { group } = req;
  const { userId } = req.valid.body;

  if (!includesId(group.members, userId)) {
    throw ApiError.conflict(
      "L'utilisateur doit d'abord être membre du groupe",
      'NOT_A_MEMBER'
    );
  }
  if (includesId(group.admins, userId)) {
    throw ApiError.conflict('Cet utilisateur est déjà administrateur du groupe', 'ALREADY_ADMIN');
  }

  group.admins.push(userId);
  await group.save();
  res.status(201).json({ data: serialize(group, req.user) });
}

async function removeAdmin(req, res) {
  const { group } = req;
  const { userId } = req.valid.params;

  if (!includesId(group.admins, userId)) {
    throw ApiError.notFound("Cet utilisateur n'est pas administrateur du groupe");
  }
  if (group.admins.length === 1) {
    throw ApiError.conflict('Un groupe doit conserver au moins un administrateur', 'LAST_ADMIN');
  }

  group.admins.pull(userId);
  await group.save();
  res.status(204).end();
}

module.exports = {
  create,
  list,
  getOne,
  update,
  remove,
  listMembers,
  addMember,
  removeMember,
  addAdmin,
  removeAdmin,
};
