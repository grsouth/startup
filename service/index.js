const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const fs = require('node:fs');

const { version } = require('./package.json');
const { buildEnvelope } = require('./response');
const { initDatabase } = require('./db');
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const linksRouter = require('./routes/links');
const todosRouter = require('./routes/todos');
const notesRouter = require('./routes/notes');
const eventsRouter = require('./routes/events');
const weatherRouter = require('./routes/weather');

const FRONTEND_DIST = path.resolve(__dirname, '..', 'public');
const FRONTEND_INDEX = path.join(FRONTEND_DIST, 'index.html');

const DEFAULT_PORT = 4000;

function createApp() {
  const app = express();

  app.set('trust proxy', true);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', authRouter);
  app.use('/api', meRouter);
  app.use('/api', linksRouter);
  app.use('/api', todosRouter);
  app.use('/api', notesRouter);
  app.use('/api', eventsRouter);
  app.use('/api', weatherRouter);

  app.get('/api/health', (_req, res) => {
    res.json(
      buildEnvelope({
        status: 'ok',
        uptime: process.uptime(),
        version,
        timestamp: new Date().toISOString()
      })
    );
  });

  app.use('/api', (_req, res) => {
    res.status(404).json(buildEnvelope(null, 'Not Found'));
  });

  if (fs.existsSync(FRONTEND_INDEX)) {
    app.use(
      express.static(FRONTEND_DIST, {
        index: false,
        extensions: ['html']
      })
    );

    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(FRONTEND_INDEX);
    });
  }

  app.use((error, _req, res, _next) => {
    console.error(error);
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = status >= 500 ? 'Internal Server Error' : error.message || 'Request failed';
    res.status(status).json(buildEnvelope(null, message));
  });

  return app;
}

function startServer(app, port) {
  const parsedPort = Number.parseInt(port, 10);
  const listenPort = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;

  const server = app.listen(listenPort, () => {
    const address = server.address();
    const actualPort =
      address && typeof address === 'object' && 'port' in address
        ? address.port
        : listenPort;
    console.log(`Startup service listening on port ${actualPort}`);
  });
  return server;
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      startServer(createApp(), process.env.PORT);
    })
    .catch((error) => {
      console.error('Failed to initialize database connection', error);
      process.exit(1);
    });
}

module.exports = {
  buildEnvelope,
  createApp,
  startServer
};
