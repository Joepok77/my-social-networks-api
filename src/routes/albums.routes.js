const { Router } = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  loadEvent,
  loadAlbum,
  loadPhoto,
  loadComment,
  requireEventParticipant,
  requireEventOrganizer,
} = require('../middlewares/access');
const { idParams, listQuery } = require('../validators/common');
const v = require('../validators/albums.validator');
const ctrl = require('../controllers/albums.controller');

const router = Router();

// Tout ce qui touche aux albums est réservé aux participants de l'événement.

// ---------- Albums d'un événement (créés et gérés par les organisateurs) ----------
const eventParams = idParams('eventId');
const albumParams = idParams('eventId', 'albumId');

router.post(
  '/events/:eventId/albums',
  authenticate,
  validate({ params: eventParams, body: v.createAlbum }),
  loadEvent,
  requireEventOrganizer,
  ctrl.createAlbum
);
router.get(
  '/events/:eventId/albums',
  authenticate,
  validate({ params: eventParams, query: listQuery }),
  loadEvent,
  requireEventParticipant,
  ctrl.listAlbums
);
router.get(
  '/events/:eventId/albums/:albumId',
  authenticate,
  validate({ params: albumParams }),
  loadEvent,
  loadAlbum,
  requireEventParticipant,
  ctrl.getAlbum
);
router.patch(
  '/events/:eventId/albums/:albumId',
  authenticate,
  validate({ params: albumParams, body: v.updateAlbum }),
  loadEvent,
  loadAlbum,
  requireEventOrganizer,
  ctrl.updateAlbum
);
router.delete(
  '/events/:eventId/albums/:albumId',
  authenticate,
  validate({ params: albumParams }),
  loadEvent,
  loadAlbum,
  requireEventOrganizer,
  ctrl.removeAlbum
);

// ---------- Photos d'un album (postées par les participants) ----------
const photosParams = idParams('albumId');
const photoParams = idParams('albumId', 'photoId');

router.post(
  '/albums/:albumId/photos',
  authenticate,
  validate({ params: photosParams, body: v.createPhoto }),
  loadAlbum,
  requireEventParticipant,
  ctrl.createPhoto
);
router.get(
  '/albums/:albumId/photos',
  authenticate,
  validate({ params: photosParams, query: listQuery }),
  loadAlbum,
  requireEventParticipant,
  ctrl.listPhotos
);
router.get(
  '/albums/:albumId/photos/:photoId',
  authenticate,
  validate({ params: photoParams }),
  loadPhoto,
  requireEventParticipant,
  ctrl.getPhoto
);
router.patch(
  '/albums/:albumId/photos/:photoId',
  authenticate,
  validate({ params: photoParams, body: v.updatePhoto }),
  loadPhoto,
  requireEventParticipant,
  ctrl.updatePhoto
);
router.delete(
  '/albums/:albumId/photos/:photoId',
  authenticate,
  validate({ params: photoParams }),
  loadPhoto,
  requireEventParticipant,
  ctrl.removePhoto
);

// ---------- Commentaires d'une photo (écrits par les participants) ----------
const commentsParams = idParams('photoId');
const commentParams = idParams('photoId', 'commentId');

router.post(
  '/photos/:photoId/comments',
  authenticate,
  validate({ params: commentsParams, body: v.comment }),
  loadPhoto,
  requireEventParticipant,
  ctrl.createComment
);
router.get(
  '/photos/:photoId/comments',
  authenticate,
  validate({ params: commentsParams, query: listQuery }),
  loadPhoto,
  requireEventParticipant,
  ctrl.listComments
);
router.get(
  '/photos/:photoId/comments/:commentId',
  authenticate,
  validate({ params: commentParams }),
  loadComment,
  requireEventParticipant,
  ctrl.getComment
);
router.patch(
  '/photos/:photoId/comments/:commentId',
  authenticate,
  validate({ params: commentParams, body: v.comment }),
  loadComment,
  requireEventParticipant,
  ctrl.updateComment
);
router.delete(
  '/photos/:photoId/comments/:commentId',
  authenticate,
  validate({ params: commentParams }),
  loadComment,
  requireEventParticipant,
  ctrl.removeComment
);

module.exports = router;
