const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const toJSON = require('../utils/toJSON');

// Coût réduit en test pour garder une suite rapide.
const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.plugin(toJSON);

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Profil visible par les autres utilisateurs : l'email reste privé.
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this.id,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
  };
};

userSchema.statics.BCRYPT_ROUNDS = BCRYPT_ROUNDS;

module.exports = model('User', userSchema);
