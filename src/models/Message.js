const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const messageSchema = new Schema(
  {
    thread: { type: Schema.Types.ObjectId, ref: 'FilDiscussion', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    // Message auquel celui-ci répond ; null pour un message de premier niveau.
    parent: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

messageSchema.plugin(toJSON);
messageSchema.index({ thread: 1, parent: 1, createdAt: 1 });

module.exports = model('Message', messageSchema);
