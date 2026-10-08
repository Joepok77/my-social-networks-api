const mongoose = require('mongoose');
const env = require('./env');

async function connectDb(uri = env.mongodbUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // Attend la création des index (dont les index uniques) avant d'accepter des requêtes.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb };
