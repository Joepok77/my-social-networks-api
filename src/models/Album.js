const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const albumSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

albumSchema.plugin(toJSON);

module.exports = model('Album', albumSchema);
