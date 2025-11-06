const express = require('express');
const cookieParser = require('cookie-parser');

const { version } = require('./package.json');

const DEFAULT_PORT = 4000;

const buildEnvelope = (data, error = null) => ({ data, error });

function createApp() {
  const app = express();

  app.set('trust proxy', true);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

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

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json(buildEnvelope(null, 'Internal Server Error'));
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
  startServer(createApp(), process.env.PORT);
}

module.exports = {
  buildEnvelope,
  createApp,
  startServer
};
