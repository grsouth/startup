const bcrypt = require('bcryptjs');

const {
  createUser,
  findUserById,
  findUserByUsername,
  createSessionRecord,
  findSessionById,
  touchSessionRecord,
  deleteSessionRecord
} = require('./db');
const { buildEnvelope } = require('./response');

const SALT_ROUNDS = 10;

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

const toPublicUser = (user) =>
  user
    ? {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    : null;

const createSession = async (userId) => {
  const session = await createSessionRecord(userId);
  return session?.id;
};

const getSession = (sessionId) => findSessionById(sessionId);

const touchSession = (sessionId) => touchSessionRecord(sessionId);

const destroySession = (sessionId) => deleteSessionRecord(sessionId);

const credentialsError = () => {
  const error = new Error('Invalid username or password');
  error.status = 401;
  return error;
};

async function registerUser({ username, password }) {
  const existing = await findUserByUsername(username);
  if (existing) {
    const error = new Error('Username already exists');
    error.status = 400;
    throw error;
  }
  const hash = await hashPassword(password);
  const user = await createUser({ username, hash });
  return toPublicUser(user);
}

async function authenticateUser({ username, password }) {
  const user = await findUserByUsername(username);
  if (!user) {
    throw credentialsError();
  }
  const matches = await verifyPassword(password, user.hash);
  if (!matches) {
    throw credentialsError();
  }
  return toPublicUser(user);
}

const requireAuth = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.sid;
    if (!sessionId) {
      res.status(401).json(buildEnvelope(null, 'Authentication required'));
      return;
    }

    const session = await touchSession(sessionId);
    if (!session) {
      res.status(401).json(buildEnvelope(null, 'Session expired'));
      return;
    }

    const user = await findUserById(session.userId);
    if (!user) {
      await destroySession(sessionId);
      res.status(401).json(buildEnvelope(null, 'User no longer exists'));
      return;
    }

    req.user = toPublicUser(user);
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

const SESSION_COOKIE_NAME = 'sid';

const applySessionCookie = (res, sessionId) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
};

module.exports = {
  hashPassword,
  verifyPassword,
  registerUser,
  authenticateUser,
  createSession,
  getSession,
  touchSession,
  destroySession,
  requireAuth,
  applySessionCookie,
  clearSessionCookie,
  toPublicUser,
  SESSION_COOKIE_NAME
};
