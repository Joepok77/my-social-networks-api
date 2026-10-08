const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const commentSchema = new Schema(
  {
    photo: { type: Schema.Types.ObjectId, ref: 'Photo', required: true, index: true },
    // Dupliqué depuis la photo pour vérifier les droits sans jointure.
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

commentSchema.plugin(toJSON);

module.exports = model('Comment', commentSchema);
