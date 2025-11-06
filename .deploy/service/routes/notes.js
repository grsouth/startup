const { createCollectionRouter } = require('./createCollectionRouter');

const normalizeNoteCreate = (input = {}) => {
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) {
    return { error: 'Note body is required' };
  }
  const record = {
    body
  };
  if (typeof input.title === 'string') {
    record.title = input.title.trim();
  }
  return { value: record };
};

const normalizeNoteUpdate = (input = {}) => {
  const updates = {};

  if (typeof input.body === 'string') {
    const body = input.body.trim();
    if (!body) {
      return { error: 'Note body cannot be empty' };
    }
    updates.body = body;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    const title =
      typeof input.title === 'string' ? input.title.trim() : '';
    updates.title = title;
  }

  return { value: updates };
};

module.exports = createCollectionRouter({
  collection: 'notes',
  path: '/notes',
  normalizeCreate: normalizeNoteCreate,
  normalizeUpdate: normalizeNoteUpdate
});
