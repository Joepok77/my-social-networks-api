// Plugin Mongoose : expose `id` au lieu de `_id` et retire les champs internes ou sensibles.
module.exports = function toJSON(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      if (ret._id !== undefined) ret.id = String(ret._id);
      delete ret._id;
      delete ret.password;
      return ret;
    },
  });
};
