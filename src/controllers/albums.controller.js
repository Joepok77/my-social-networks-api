const Album = require('../models/Album');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { searchRegex } = require('../utils/text');
const { sameId, isEventOrganizer } = require('../utils/roles');
const { deleteAlbum, deletePhoto } = require('../utils/cascade');

const AUTHOR = { path: 'author', select: 'firstName lastName avatar' };

const isAuthor = (doc, user) => sameId(doc.author, user._id);

// ---------- Albums ----------

async function createAlbum(req, res) {
  const album = await Album.create({
    ...req.valid.body,
    event: req.event._id,
    createdBy: req.user._id,
  });
  res.status(201).json({ data: album });
}

async function listAlbums(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = { event: req.event._id };
  if (q) filter.$or = [{ title: searchRegex(q) }, { description: searchRegex(q) }];
  const { items, pagination } = await paginate(Album, filter, { page, limit });
  res.json({ data: items, pagination });
}

function getAlbum(req, res) {
  res.json({ data: req.album });
}

async function updateAlbum(req, res) {
  req.album.set(req.valid.body);
  await req.album.save();
  res.json({ data: req.album });
}

async function removeAlbum(req, res) {
  await deleteAlbum(req.album);
  res.status(204).end();
}

// ---------- Photos ----------

async function createPhoto(req, res) {
  const photo = await Photo.create({
    ...req.valid.body,
    album: req.album._id,
    event: req.event._id,
    author: req.user._id,
  });
  await photo.populate(AUTHOR);
  res.status(201).json({ data: photo });
}

async function listPhotos(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = { album: req.album._id };
  if (q) filter.caption = searchRegex(q);
  const { items, pagination } = await paginate(Photo, filter, { page, limit }, { populate: AUTHOR });
  res.json({ data: items, pagination });
}

async function getPhoto(req, res) {
  await req.photo.populate(AUTHOR);
  res.json({ data: req.photo });
}

async function updatePhoto(req, res) {
  const { photo } = req;
  if (!isAuthor(photo, req.user)) {
    throw ApiError.forbidden('Seul son auteur peut modifier une photo');
  }
  photo.caption = req.valid.body.caption;
  await photo.save();
  await photo.populate(AUTHOR);
  res.json({ data: photo });
}

async function removePhoto(req, res) {
  const { photo } = req;
  if (!isAuthor(photo, req.user) && !isEventOrganizer(req.event, req.user)) {
    throw ApiError.forbidden('Seuls son auteur ou un organisateur peuvent supprimer une photo');
  }
  await deletePhoto(photo);
  res.status(204).end();
}

// ---------- Commentaires ----------

async function createComment(req, res) {
  const comment = await Comment.create({
    content: req.valid.body.content,
    photo: req.photo._id,
    event: req.event._id,
    author: req.user._id,
  });
  await comment.populate(AUTHOR);
  res.status(201).json({ data: comment });
}

async function listComments(req, res) {
  const { q, page, limit } = req.valid.query;
  const filter = { photo: req.photo._id };
  if (q) filter.content = searchRegex(q);
  const { items, pagination } = await paginate(
    Comment,
    filter,
    { page, limit },
    { sort: { createdAt: 1 }, populate: AUTHOR }
  );
  res.json({ data: items, pagination });
}

async function getComment(req, res) {
  await req.comment.populate(AUTHOR);
  res.json({ data: req.comment });
}

async function updateComment(req, res) {
  const { comment } = req;
  if (!isAuthor(comment, req.user)) {
    throw ApiError.forbidden('Seul son auteur peut modifier un commentaire');
  }
  comment.content = req.valid.body.content;
  await comment.save();
  await comment.populate(AUTHOR);
  res.json({ data: comment });
}

async function removeComment(req, res) {
  const { comment } = req;
  if (!isAuthor(comment, req.user) && !isEventOrganizer(req.event, req.user)) {
    throw ApiError.forbidden(
      'Seuls son auteur ou un organisateur peuvent supprimer un commentaire'
    );
  }
  await comment.deleteOne();
  res.status(204).end();
}

module.exports = {
  createAlbum,
  listAlbums,
  getAlbum,
  updateAlbum,
  removeAlbum,
  createPhoto,
  listPhotos,
  getPhoto,
  updatePhoto,
  removePhoto,
  createComment,
  listComments,
  getComment,
  updateComment,
  removeComment,
};
