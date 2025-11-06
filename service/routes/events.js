const { createCollectionRouter } = require('./createCollectionRouter');

const parseInstant = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const normalizeEventCreate = (input = {}) => {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    return { error: 'Event title is required' };
  }

  const startDate = parseInstant(input.startISO);
  if (!startDate) {
    return { error: 'Valid startISO is required' };
  }

  const record = {
    title,
    startISO: startDate.toISOString()
  };

  const endDate = parseInstant(input.endISO);
  if (endDate) {
    if (endDate < startDate) {
      return { error: 'endISO must be after startISO' };
    }
    record.endISO = endDate.toISOString();
  }

  if (Object.prototype.hasOwnProperty.call(input, 'allDay')) {
    record.allDay = Boolean(input.allDay);
  }

  if (typeof input.description === 'string') {
    record.description = input.description.trim();
  }

  if (typeof input.location === 'string') {
    record.location = input.location.trim();
  }

  return { value: record };
};

const normalizeEventUpdate = (input = {}) => {
  const updates = {};
  let startDate;

  if (typeof input.title === 'string') {
    const title = input.title.trim();
    if (!title) {
      return { error: 'Event title cannot be empty' };
    }
    updates.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'startISO')) {
    startDate = parseInstant(input.startISO);
    if (!startDate) {
      return { error: 'startISO must be a valid ISO string' };
    }
    updates.startISO = startDate.toISOString();
  }

  if (Object.prototype.hasOwnProperty.call(input, 'endISO')) {
    if (input.endISO === null || input.endISO === undefined || input.endISO === '') {
      updates.endISO = undefined;
    } else {
      const endDate = parseInstant(input.endISO);
      if (!endDate) {
        return { error: 'endISO must be a valid ISO string' };
      }
      const effectiveStart =
        startDate ||
        (Object.prototype.hasOwnProperty.call(updates, 'startISO')
          ? new Date(updates.startISO)
          : null);
      if (effectiveStart && endDate < effectiveStart) {
        return { error: 'endISO must be after startISO' };
      }
      updates.endISO = endDate.toISOString();
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'allDay')) {
    updates.allDay = Boolean(input.allDay);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    updates.description =
      typeof input.description === 'string' ? input.description.trim() : '';
  }

  if (Object.prototype.hasOwnProperty.call(input, 'location')) {
    updates.location =
      typeof input.location === 'string' ? input.location.trim() : '';
  }

  return { value: updates };
};

const prepareEventList = (records, req) => {
  const fromDate = parseInstant(req.query?.from);
  const toDate = parseInstant(req.query?.to);

  let filtered = Array.isArray(records) ? records.slice() : [];

  if (fromDate) {
    filtered = filtered.filter((record) => {
      const start = parseInstant(record.startISO);
      return start && start >= fromDate;
    });
  }

  if (toDate) {
    filtered = filtered.filter((record) => {
      const start = parseInstant(record.startISO);
      return start && start <= toDate;
    });
  }

  filtered.sort((a, b) => {
    const aStart = parseInstant(a.startISO);
    const bStart = parseInstant(b.startISO);
    if (!aStart || !bStart) {
      return 0;
    }
    return aStart - bStart;
  });

  return filtered;
};

module.exports = createCollectionRouter({
  collection: 'events',
  path: '/events',
  normalizeCreate: normalizeEventCreate,
  normalizeUpdate: normalizeEventUpdate,
  prepareList: prepareEventList
});
