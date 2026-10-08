const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const openapi = require('./docs/openapi');
const accessLogger = require('./middlewares/logger');
const corsMiddleware = require('./middlewares/cors');
const rejectMongoOperators = require('./middlewares/sanitize');
const { globalLimiter } = require('./middlewares/rateLimiters');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');

// Journal d'accès en premier, pour tracer aussi les requêtes refusées.
app.use(accessLogger());

// En-têtes de sécurité. HSTS et upgrade-insecure-requests n'ont de sens qu'en HTTPS.
app.use(
  helmet({
    strictTransportSecurity: env.useHttps,
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: env.useHttps ? [] : null },
    },
  })
);

app.use(corsMiddleware);
app.use('/api', globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(rejectMongoOperators);

// Documentation de l'API (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'My Social Networks API' }));

app.use('/api', require('./routes/auth.routes'));
app.use('/api', require('./routes/users.routes'));
app.use('/api', require('./routes/groups.routes'));
app.use('/api', require('./routes/events.routes'));
app.use('/api', require('./routes/filsDiscussion.routes'));
app.use('/api', require('./routes/albums.routes'));
app.use('/api', require('./routes/sondages.routes'));
app.use('/api', require('./routes/billetterie.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
