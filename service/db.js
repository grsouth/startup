const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { MongoClient, ServerApiVersion } = require('mongodb');

const CONFIG_PATH = path.join(__dirname, 'dbConfig.json');
const DEFAULT_DB_NAME = 'startup';
const DEFAULT_CLIENT_OPTIONS = Object.freeze({
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});
const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';
const now = () => new Date().toISOString();

const clone = (record) => {
  if (!record || typeof record !== 'object') {
    return record ?? null;
  }
  const { _id, ...rest } = record;
  const id =
    typeof rest.id === 'string'
      ? rest.id
      : typeof _id === 'string'
        ? _id
        : _id && typeof _id.toString === 'function'
          ? _id.toString()
          : undefined;
  const result = { ...rest };
  if (typeof id !== 'undefined') {
    result.id = id;
  }
  return result;
};

let mongoClient = null;
let mongoDb = null;
let connectPromise = null;
let mongoConfig = null;

const normalizeConfig = (config = {}) => {
  if (!config || typeof config !== 'object') {
    return {};
  }
  const uri =
    typeof config.uri === 'string'
      ? config.uri
      : typeof config.url === 'string'
        ? config.url
        : typeof config.connectionString === 'string'
          ? config.connectionString
          : '';
  const dbName =
    typeof config.dbName === 'string'
      ? config.dbName
      : typeof config.database === 'string'
        ? config.database
        : DEFAULT_DB_NAME;

  const options =
    typeof config.options === 'object'
      ? config.options
      : typeof config.clientOptions === 'object'
        ? config.clientOptions
        : {};

  return {
    uri: uri.trim(),
    dbName: dbName.trim() || DEFAULT_DB_NAME,
    options
  };
};

const readConfigFromFile = () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return normalizeConfig(parsed);
  } catch (error) {
    throw new Error(`Unable to parse dbConfig.json: ${error.message}`);
  }
};

const loadDbConfig = () => {
  if (process.env.MONGODB_URI) {
    return normalizeConfig({
      uri: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME
    });
  }
  return readConfigFromFile();
};

const getMongoConfig = () => mongoConfig;

async function ensureIndexes(dbInstance = mongoDb) {
  if (!dbInstance) {
    return;
  }
  await dbInstance.collection(USERS_COLLECTION).createIndex(
    { username: 1 },
    {
      name: 'users_username_unique',
      unique: true
    }
  );
  await dbInstance.collection(SESSIONS_COLLECTION).createIndex(
    { userId: 1 },
    {
      name: 'sessions_user_id'
    }
  );
  await dbInstance.collection(SESSIONS_COLLECTION).createIndex(
    { updatedAt: 1 },
    {
      name: 'sessions_updated_at'
    }
  );
}

async function initDatabase(overrides = {}) {
  if (mongoDb) {
    return mongoDb;
  }
  if (connectPromise) {
    return connectPromise;
  }
  const baseConfig = loadDbConfig();
  const mergedConfig = {
    dbName: DEFAULT_DB_NAME,
    options: {},
    ...baseConfig,
    ...overrides
  };
  if (!mergedConfig.uri) {
    throw new Error(
      'MongoDB connection info missing. Set MONGODB_URI (and optional MONGODB_DB_NAME) or create service/dbConfig.json'
    );
  }
  const clientOptions = {
    ...DEFAULT_CLIENT_OPTIONS,
    ...(mergedConfig.options || {})
  };

  const client = new MongoClient(mergedConfig.uri, clientOptions);
  connectPromise = client
    .connect()
    .then(async () => {
      mongoClient = client;
      mongoDb = client.db(mergedConfig.dbName || DEFAULT_DB_NAME);
      mongoConfig = mergedConfig;
      await ensureIndexes(mongoDb);
      return mongoDb;
    })
    .catch(async (error) => {
      try {
        await client.close();
      } catch {
        // ignore cleanup errors
      }
      mongoClient = null;
      mongoDb = null;
      mongoConfig = null;
      connectPromise = null;
      throw error;
    });

  return connectPromise;
}

const getDb = () => {
  if (!mongoDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return mongoDb;
};

const getCollection = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Collection name is required');
  }
  return getDb().collection(name);
};

const getMongoClient = () => {
  if (!mongoClient) {
    throw new Error('Mongo client not initialized. Call initDatabase() first.');
  }
  return mongoClient;
};

const closeDatabase = async (force = false) => {
  if (!mongoClient) {
    return;
  }
  await mongoClient.close(force);
  mongoClient = null;
  mongoDb = null;
  mongoConfig = null;
  connectPromise = null;
};

const sanitizeUpdates = (updates = {}) => {
  if (!updates || typeof updates !== 'object') {
    return {};
  }
  const { id, _id, ...rest } = updates;
  return rest;
};

async function createUser({ username, hash }) {
  const timestamp = now();
  const user = {
    _id: randomUUID(),
    username,
    hash,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await getCollection(USERS_COLLECTION).insertOne(user);
  return clone(user);
}

async function updateUser(id, updates) {
  if (!id) {
    return null;
  }
  const timestamp = now();
  const sanitized = {
    ...sanitizeUpdates(updates),
    updatedAt: timestamp
  };
  const result = await getCollection(USERS_COLLECTION).findOneAndUpdate(
    { _id: id },
    { $set: sanitized },
    { returnDocument: 'after' }
  );
  return clone(result.value);
}

const findUserById = async (id) => {
  if (!id) {
    return null;
  }
  const user = await getCollection(USERS_COLLECTION).findOne({ _id: id });
  return clone(user);
};

const findUserByUsername = async (username) => {
  if (!username) {
    return null;
  }
  const user = await getCollection(USERS_COLLECTION).findOne({ username });
  return clone(user);
};

async function createSessionRecord(userId) {
  if (!userId) {
    throw new Error('User ID required to create session');
  }
  const timestamp = now();
  const session = {
    _id: randomUUID(),
    userId,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await getCollection(SESSIONS_COLLECTION).insertOne(session);
  return clone(session);
}

const findSessionById = async (sessionId) => {
  if (!sessionId) {
    return null;
  }
  const session = await getCollection(SESSIONS_COLLECTION).findOne({ _id: sessionId });
  return clone(session);
};

const touchSessionRecord = async (sessionId) => {
  if (!sessionId) {
    return null;
  }
  const timestamp = now();
  const result = await getCollection(SESSIONS_COLLECTION).findOneAndUpdate(
    { _id: sessionId },
    { $set: { updatedAt: timestamp } },
    { returnDocument: 'after' }
  );
  return clone(result.value);
};

const deleteSessionRecord = async (sessionId) => {
  if (!sessionId) {
    return false;
  }
  const result = await getCollection(SESSIONS_COLLECTION).deleteOne({ _id: sessionId });
  return result.deletedCount > 0;
};

const collections = {
  links: new Map(),
  todos: new Map(),
  notes: new Map(),
  events: new Map()
};

const getCollectionForUser = (collection, userId) => {
  if (!collections[collection]) {
    throw new Error(`Unknown collection "${collection}"`);
  }
  const store = collections[collection];
  if (!store.has(userId)) {
    store.set(userId, new Map());
  }
  return store.get(userId);
};

const listCollection = (collection, userId) => {
  const store = getCollectionForUser(collection, userId);
  return Array.from(store.values(), clone);
};

const createCollectionItem = (collection, userId, input) => {
  const store = getCollectionForUser(collection, userId);
  const timestamp = now();
  const record = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input
  };
  store.set(record.id, record);
  return clone(record);
};

const updateCollectionItem = (collection, userId, id, updates) => {
  const store = getCollectionForUser(collection, userId);
  const existing = store.get(id);
  if (!existing) {
    return null;
  }
  const timestamp = now();
  const next = {
    ...existing,
    ...updates,
    updatedAt: timestamp
  };
  store.set(id, next);
  return clone(next);
};

const removeCollectionItem = (collection, userId, id) => {
  const store = getCollectionForUser(collection, userId);
  const existing = store.get(id);
  if (!existing) {
    return null;
  }
  store.delete(id);
  return clone(existing);
};

module.exports = {
  loadDbConfig,
  initDatabase,
  getDb,
  getCollection,
  getMongoClient,
  closeDatabase,
  getMongoConfig,
  createUser,
  updateUser,
  findUserById,
  findUserByUsername,
  createSessionRecord,
  findSessionById,
  touchSessionRecord,
  deleteSessionRecord,
  listCollection,
  createCollectionItem,
  updateCollectionItem,
  removeCollectionItem,
  collections: Object.freeze({ ...collections })
};
