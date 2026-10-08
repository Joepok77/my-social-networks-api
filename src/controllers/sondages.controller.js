const Sondage = require('../models/Sondage');
const ReponseSondage = require('../models/ReponseSondage');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const { deletePoll } = require('../utils/cascade');

const alreadyAnswered = () =>
  ApiError.conflict('Vous avez déjà répondu à ce sondage', 'ALREADY_ANSWERED');

async function create(req, res) {
  const poll = await Sondage.create({
    ...req.valid.body,
    event: req.event._id,
    createdBy: req.user._id,
  });
  res.status(201).json({ data: poll });
}

async function list(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = { event: req.event._id };
  if (q) filter.title = searchRegex(q);
  const { items, pagination } = await paginate(Sondage, filter, { page, limit });
  res.json({ data: items, pagination });
}

function getOne(req, res) {
  res.json({ data: req.poll });
}

async function update(req, res) {
  const { poll } = req;
  const { body } = req.valid;

  // Les réponses déjà données pointent sur les questions existantes : on ne les change plus.
  if (body.questions && (await ReponseSondage.exists({ poll: poll._id }))) {
    throw ApiError.conflict(
      'Les questions ne peuvent plus être modifiées : des participants ont déjà répondu',
      'POLL_HAS_RESPONSES'
    );
  }

  poll.set(body);
  await poll.save();
  res.json({ data: poll });
}

async function remove(req, res) {
  await deletePoll(req.poll);
  res.status(204).end();
}

// ---------- Réponses ----------

// Une réponse par question, choisie parmi les réponses proposées, pour chaque question du sondage.
function assertAnswersMatchPoll(poll, answers) {
  for (const answer of answers) {
    const question = poll.questions.id(answer.question);
    if (!question) {
      throw ApiError.badRequest('Une réponse porte sur une question inconnue de ce sondage');
    }
    if (!question.options.id(answer.option)) {
      throw ApiError.badRequest(
        `La réponse choisie pour la question « ${question.text} » ne fait pas partie des choix proposés`
      );
    }
  }
  // Le validateur garantit une seule réponse par question : même nombre = toutes les questions couvertes.
  if (answers.length !== poll.questions.length) {
    throw ApiError.badRequest('Vous devez répondre à chaque question du sondage');
  }
}

async function respond(req, res) {
  const { poll, user } = req;
  const { answers } = req.valid.body;

  assertAnswersMatchPoll(poll, answers);
  if (await ReponseSondage.exists({ poll: poll._id, user: user._id })) throw alreadyAnswered();

  let response;
  try {
    response = await ReponseSondage.create({ poll: poll._id, user: user._id, answers });
  } catch (error) {
    // Deux envois simultanés : l'index unique (sondage, utilisateur) tranche.
    if (error.code === 11000) throw alreadyAnswered();
    throw error;
  }
  res.status(201).json({ data: response });
}

async function listResponses(req, res) {
  const { page, limit } = req.valid.query;
  const { items, pagination } = await paginate(
    ReponseSondage,
    { poll: req.poll._id },
    { page, limit },
    { populate: { path: 'user', select: 'firstName lastName avatar' } }
  );
  res.json({ data: items, pagination });
}

async function getMyResponse(req, res) {
  const response = await ReponseSondage.findOne({ poll: req.poll._id, user: req.user._id });
  if (!response) throw ApiError.notFound("Vous n'avez pas encore répondu à ce sondage");
  res.json({ data: response });
}

module.exports = { create, list, getOne, update, remove, respond, listResponses, getMyResponse };
