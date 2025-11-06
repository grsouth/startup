const { createCollectionRouter } = require('./createCollectionRouter');

const normalizeUrl = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return { error: 'URL is required' };
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { value: trimmed };
  }
  return { value: `https://${trimmed}` };
};

const normalizeLinkCreate = (input = {}) => {
  const labelSource =
    typeof input.label === 'string'
      ? input.label
      : typeof input.title === 'string'
        ? input.title
        : '';
  const label = labelSource.trim();
  if (!label) {
    return { error: 'Label is required' };
  }

  const { value: url, error: urlError } = normalizeUrl(input.url);
  if (urlError) {
    return { error: urlError };
  }

  const iconUrl =
    typeof input.iconUrl === 'string' ? input.iconUrl.trim() : undefined;

  const record = {
    label,
    url
  };

  if (iconUrl !== undefined) {
    record.iconUrl = iconUrl;
  }

  if (typeof input.pinned === 'boolean') {
    record.pinned = input.pinned;
  }

  return { value: record };
};

const normalizeLinkUpdate = (input = {}) => {
  const updates = {};

  if (typeof input.label === 'string' || typeof input.title === 'string') {
    const labelSource =
      typeof input.label === 'string' ? input.label : input.title;
    const label = labelSource.trim();
    if (!label) {
      return { error: 'Label cannot be empty' };
    }
    updates.label = label;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'url')) {
    const { value: url, error } = normalizeUrl(input.url);
    if (error) {
      return { error };
    }
    updates.url = url;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'iconUrl')) {
    updates.iconUrl =
      typeof input.iconUrl === 'string' ? input.iconUrl.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(input, 'pinned')) {
    updates.pinned = Boolean(input.pinned);
  }

  return { value: updates };
};

module.exports = createCollectionRouter({
  collection: 'links',
  path: '/links',
  normalizeCreate: normalizeLinkCreate,
  normalizeUpdate: normalizeLinkUpdate
});
