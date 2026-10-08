const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const typeBilletSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0 },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'La quantité doit être un entier' },
    },
    // Nombre de billets vendus, incrémenté de façon atomique à chaque achat.
    sold: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'types_billets' }
);

typeBilletSchema.virtual('remaining').get(function remaining() {
  return this.quantity - this.sold;
});

typeBilletSchema.plugin(toJSON);

module.exports = model('TypeBillet', typeBilletSchema);
