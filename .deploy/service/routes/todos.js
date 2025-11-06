const { createCollectionRouter } = require('./createCollectionRouter');

const normalizeTodoCreate = (input = {}) => {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) {
    return { error: 'Todo text is required' };
  }
  const done = typeof input.done === 'boolean' ? input.done : false;
  return { value: { text, done } };
};

const normalizeTodoUpdate = (input = {}) => {
  const updates = {};

  if (typeof input.text === 'string') {
    const text = input.text.trim();
    if (!text) {
      return { error: 'Todo text cannot be empty' };
    }
    updates.text = text;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'done')) {
    updates.done = Boolean(input.done);
  }

  return { value: updates };
};

module.exports = createCollectionRouter({
  collection: 'todos',
  path: '/todos',
  normalizeCreate: normalizeTodoCreate,
  normalizeUpdate: normalizeTodoUpdate
});
