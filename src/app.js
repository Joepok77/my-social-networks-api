const express = require('express');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

module.exports = app;
