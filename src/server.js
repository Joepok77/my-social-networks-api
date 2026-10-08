const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');

const env = require('./config/env');
const { connectDb, disconnectDb } = require('./config/db');
const app = require('./app');

function createServer() {
  if (!env.useHttps) return http.createServer(app);

  const missing = [env.sslKeyPath, env.sslCertPath].filter((file) => !fs.existsSync(file));
  if (missing.length > 0) {
    throw new Error(
      `USE_HTTPS=true mais certificat introuvable : ${missing.join(', ')}.\n` +
        'Générez-le avec les commandes openssl du README ou passez USE_HTTPS=false.'
    );
  }
  return https.createServer(
    { key: fs.readFileSync(env.sslKeyPath), cert: fs.readFileSync(env.sslCertPath) },
    app
  );
}

async function start() {
  const server = createServer();
  await connectDb();

  server.listen(env.port, () => {
    const scheme = env.useHttps ? 'https' : 'http';
    console.log(`API démarrée sur ${scheme}://localhost:${env.port} (documentation : /api-docs)`);
  });

  const shutdown = () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
