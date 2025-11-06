const { v4: uuidv4 } = require('uuid');

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
  const id = uuidv4();
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
    id: uuidv4(),
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
