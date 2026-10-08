const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const addressSchema = new Schema(
  {
    street: { type: String, required: true, trim: true, maxlength: 200 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false }
);

const billetSchema = new Schema(
  {
    ticketType: { type: Schema.Types.ObjectId, ref: 'TypeBillet', required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    // Identifiant de la personne extérieure : un seul billet par email et par événement.
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    address: { type: addressSchema, required: true },
    purchasedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'billets' }
);

billetSchema.plugin(toJSON);
billetSchema.index({ event: 1, email: 1 }, { unique: true });

module.exports = model('Billet', billetSchema);
