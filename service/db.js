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
  await dbInstance.collection('users').createIndex(
    { username: 1 },
    {
      name: 'users_username_unique',
      unique: true
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

const users = new Map();
const collections = {
  links: new Map(),
  todos: new Map(),
  notes: new Map(),
  events: new Map()
};

const now = () => new Date().toISOString();

const clone = (record) => ({ ...record });

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

function createUser({ username, hash }) {
  const id = randomUUID();
  const timestamp = now();
  const user = {
    id,
    username,
    hash,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  users.set(id, user);
  return clone(user);
}

function updateUser(id, updates) {
  const existing = users.get(id);
  if (!existing) {
    return null;
  }
  const timestamp = now();
  const next = {
    ...existing,
    ...updates,
    updatedAt: timestamp
  };
  users.set(id, next);
  return clone(next);
}

const findUserById = (id) => {
  const user = users.get(id);
  return user ? clone(user) : null;
};

const findUserByUsername = (username) => {
  for (const user of users.values()) {
    if (user.username === username) {
      return clone(user);
    }
  }
  return null;
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

const reset = () => {
  users.clear();
  Object.values(collections).forEach((collection) => {
    collection.clear();
  });
};

const exportData = () => ({
  users: Array.from(users.values(), clone),
  collections: Object.fromEntries(
    Object.entries(collections).map(([name, collection]) => [
      name,
      Object.fromEntries(
        Array.from(collection.entries()).map(([userId, records]) => [
          userId,
          Array.from(records.values(), clone)
        ])
      )
    ])
  )
});

const importData = (data) => {
  reset();
  if (!data) {
    return;
  }
  if (Array.isArray(data.users)) {
    data.users.forEach((user) => {
      if (user?.id && user?.username && user?.hash) {
        users.set(user.id, { ...user });
      }
    });
  }

  if (data.collections && typeof data.collections === 'object') {
    for (const [name, userCollections] of Object.entries(data.collections)) {
      if (!collections[name] || typeof userCollections !== 'object') {
        continue;
      }
      const targetCollection = collections[name];
      for (const [userId, records] of Object.entries(userCollections)) {
        if (!Array.isArray(records)) {
          continue;
        }
        const bucket = new Map();
        records.forEach((record) => {
          if (record?.id) {
            bucket.set(record.id, { ...record });
          }
        });
        if (bucket.size > 0) {
          targetCollection.set(userId, bucket);
        }
      }
    }
  }
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
  listCollection,
  createCollectionItem,
  updateCollectionItem,
  removeCollectionItem,
  reset,
  exportData,
  importData,
  collections: Object.freeze({ ...collections })
};
