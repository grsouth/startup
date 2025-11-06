const express = require('express');

const {
  registerUser,
  authenticateUser,
  createSession,
  destroySession,
  applySessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME
} = require('../auth');
const { buildEnvelope } = require('../response');

const router = express.Router();

const normalizeCredentials = (credentials = {}) => {
  const username = typeof credentials.username === 'string' ? credentials.username.trim() : '';
  const password = typeof credentials.password === 'string' ? credentials.password : '';
  return { username, password };
};

router.post('/auth/register', async (req, res, next) => {
  try {
    const { username, password } = normalizeCredentials(req.body);
    if (!username || !password) {
      res.status(400).json(buildEnvelope(null, 'Username and password required'));
      return;
    }

    const user = await registerUser({ username, password });
    const sessionId = createSession(user.id);
    applySessionCookie(res, sessionId);
    res.status(201).json(buildEnvelope(user));
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = normalizeCredentials(req.body);
    if (!username || !password) {
      res.status(400).json(buildEnvelope(null, 'Username and password required'));
      return;
    }

    const user = await authenticateUser({ username, password });
    const sessionId = createSession(user.id);
    applySessionCookie(res, sessionId);
    res.json(buildEnvelope(user));
  } catch (error) {
    next(error);
  }
});

router.post('/auth/logout', (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionId) {
    destroySession(sessionId);
  }
  clearSessionCookie(res);
  res.json(buildEnvelope({ success: true }));
});

module.exports = router;
