const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const GROUP_TYPES = ['public', 'private', 'secret'];

const atLeastOne = (label) => ({
  validator: (list) => Array.isArray(list) && list.length >= 1,
  message: `Un groupe doit avoir au moins un ${label}`,
});

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    icon: { type: String, default: null },
    coverPhoto: { type: String, default: null },
    type: { type: String, enum: GROUP_TYPES, default: 'public' },
    allowMembersToPost: { type: Boolean, default: true },
    allowMembersToCreateEvents: { type: Boolean, default: false },
    // Un administrateur est toujours aussi membre.
    admins: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: atLeastOne('administrateur'),
    },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: atLeastOne('membre'),
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

groupSchema.plugin(toJSON);
groupSchema.index({ members: 1 });
groupSchema.index({ type: 1 });

groupSchema.statics.TYPES = GROUP_TYPES;

module.exports = model('Group', groupSchema);
