const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const filDiscussionSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group' },
    event: { type: Schema.Types.ObjectId, ref: 'Event' },
  },
  { timestamps: true, collection: 'fils_discussion' }
);

filDiscussionSchema.plugin(toJSON);

// Un fil est lié à un groupe OU à un événement : jamais les deux, jamais aucun.
filDiscussionSchema.pre('validate', function checkSingleParent() {
  const hasGroup = this.group != null;
  const hasEvent = this.event != null;
  if (hasGroup === hasEvent) {
    this.invalidate(
      hasGroup ? 'event' : 'group',
      'Un fil de discussion doit être lié à un groupe ou à un événement, mais pas aux deux'
    );
  }
});

// Un seul fil par groupe et par événement.
filDiscussionSchema.index(
  { group: 1 },
  { unique: true, partialFilterExpression: { group: { $type: 'objectId' } } }
);
filDiscussionSchema.index(
  { event: 1 },
  { unique: true, partialFilterExpression: { event: { $type: 'objectId' } } }
);

module.exports = model('FilDiscussion', filDiscussionSchema);
