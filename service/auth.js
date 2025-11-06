const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const {
  createUser,
  updateUser,
  findUserById,
  findUserByUsername
} = require('./db');

const SALT_ROUNDS = 10;
const sessions = new Map();

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

const createSession = (userId) => {
  const sessionId = uuidv4();
  const createdAt = new Date().toISOString();
  sessions.set(sessionId, {
    id: sessionId,
    userId,
    createdAt,
    updatedAt: createdAt
  });
  return sessionId;
};

const getSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  return { ...session };
};

const touchSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  const updated = {
    ...session,
    updatedAt: new Date().toISOString()
  };
  sessions.set(sessionId, updated);
  return { ...updated };
};

const destroySession = (sessionId) => sessions.delete(sessionId);

const credentialsError = () => {
  const error = new Error('Invalid username or password');
  error.status = 401;
  return error;
};

async function registerUser({ username, password }) {
  const existing = findUserByUsername(username);
  if (existing) {
    const error = new Error('Username already exists');
    error.status = 400;
    throw error;
  }
  const hash = await hashPassword(password);
  const user = createUser({ username, hash });
  return toPublicUser(user);
}

async function authenticateUser({ username, password }) {
  const user = findUserByUsername(username);
  if (!user) {
    throw credentialsError();
  }
  const matches = await verifyPassword(password, user.hash);
  if (!matches) {
    throw credentialsError();
  }
  return toPublicUser(user);
}

const requireAuth = (req, res, next) => {
  const sessionId = req.cookies?.sid;
  if (!sessionId) {
    res.status(401).json({ data: null, error: 'Authentication required' });
    return;
  }

  const session = touchSession(sessionId);
  if (!session) {
    res.status(401).json({ data: null, error: 'Session expired' });
    return;
  }

  const user = findUserById(session.userId);
  if (!user) {
    destroySession(sessionId);
    res.status(401).json({ data: null, error: 'User no longer exists' });
    return;
  }

  req.user = toPublicUser(user);
  req.session = session;
  next();
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
  SESSION_COOKIE_NAME,
  sessions
};
