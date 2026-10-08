// Suppressions en cascade : une ressource supprimée emporte ce qui en dépend.
const Event = require('../models/Event');
const FilDiscussion = require('../models/FilDiscussion');
const Message = require('../models/Message');
const Album = require('../models/Album');
const Photo = require('../models/Photo');
const Comment = require('../models/Comment');
const Sondage = require('../models/Sondage');
const ReponseSondage = require('../models/ReponseSondage');
const TypeBillet = require('../models/TypeBillet');
const Billet = require('../models/Billet');

// Supprime un message et toutes les réponses qui en découlent.
async function deleteMessageTree(messageId) {
  let ids = [messageId];
  while (ids.length > 0) {
    const children = await Message.find({ parent: { $in: ids } }).distinct('_id');
    await Message.deleteMany({ _id: { $in: ids } });
    ids = children;
  }
}

async function deleteThread(thread) {
  await Message.deleteMany({ thread: thread._id });
  await thread.deleteOne();
}

async function deletePhoto(photo) {
  await Comment.deleteMany({ photo: photo._id });
  await photo.deleteOne();
}

async function deleteAlbum(album) {
  const photoIds = await Photo.find({ album: album._id }).distinct('_id');
  await Comment.deleteMany({ photo: { $in: photoIds } });
  await Photo.deleteMany({ album: album._id });
  await album.deleteOne();
}

async function deletePoll(poll) {
  await ReponseSondage.deleteMany({ poll: poll._id });
  await poll.deleteOne();
}

async function deleteEvent(event) {
  const filter = { event: event._id };
  const [thread, pollIds] = await Promise.all([
    FilDiscussion.findOne(filter),
    Sondage.find(filter).distinct('_id'),
  ]);
  await Promise.all([
    thread && deleteThread(thread),
    Comment.deleteMany(filter),
    Photo.deleteMany(filter),
    Album.deleteMany(filter),
    ReponseSondage.deleteMany({ poll: { $in: pollIds } }),
    Sondage.deleteMany(filter),
    Billet.deleteMany(filter),
    TypeBillet.deleteMany(filter),
  ]);
  await event.deleteOne();
}

// Les événements créés dans le groupe sont conservés, simplement détachés du groupe.
async function deleteGroup(group) {
  const thread = await FilDiscussion.findOne({ group: group._id });
  if (thread) await deleteThread(thread);
  await Event.updateMany({ group: group._id }, { $set: { group: null } });
  await group.deleteOne();
}

module.exports = {
  deleteMessageTree,
  deleteThread,
  deletePhoto,
  deleteAlbum,
  deletePoll,
  deleteEvent,
  deleteGroup,
};
