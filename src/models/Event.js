const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const VISIBILITIES = ['public', 'private'];

const eventSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    coverPhoto: { type: String, default: null },
    visibility: { type: String, enum: VISIBILITIES, default: 'public' },
    organizers: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (list) => Array.isArray(list) && list.length >= 1,
        message: 'Un événement doit avoir au moins un organisateur',
      },
    },
    // Un organisateur est toujours aussi participant.
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // Renseigné quand l'événement est créé depuis un groupe.
    group: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    ticketingEnabled: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

eventSchema.plugin(toJSON);
eventSchema.index({ participants: 1 });
eventSchema.index({ group: 1 });
eventSchema.index({ startDate: 1 });

// Règles portant sur plusieurs champs : vérifiées à chaque sauvegarde, quel que soit le champ modifié.
eventSchema.pre('validate', function checkCrossFieldRules() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'La date de fin doit être postérieure à la date de début');
  }
  if (this.ticketingEnabled && this.visibility !== 'public') {
    this.invalidate('ticketingEnabled', 'La billetterie est réservée aux événements publics');
  }
});

eventSchema.statics.VISIBILITIES = VISIBILITIES;

module.exports = model('Event', eventSchema);
