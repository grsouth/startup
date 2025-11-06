const express = require('express');

const { requireAuth } = require('../auth');
const { buildEnvelope } = require('../response');
const {
  listCollection,
  createCollectionItem,
  updateCollectionItem,
  removeCollectionItem
} = require('../db');

const runNormalizer = (normalizer, payload, context) => {
  if (typeof normalizer !== 'function') {
    return { value: payload };
  }
  const result = normalizer(payload, context) || {};
  const value = result.value ?? null;
  const error = typeof result.error === 'string' ? result.error : null;
  return { value, error };
};

function createCollectionRouter(options) {
  if (!options?.collection) {
    throw new Error('collection option is required');
  }

  const basePath = options.path ?? `/${options.collection}`;
  const normalizeCreate = options.normalizeCreate;
  const normalizeUpdate = options.normalizeUpdate || options.normalizeCreate;
  const prepareList =
    typeof options.prepareList === 'function'
      ? options.prepareList
      : (records) => records;

  const router = express.Router();

  router.get(basePath, requireAuth, (req, res, next) => {
    try {
      const records = listCollection(options.collection, req.user.id);
      const prepared = prepareList(records, req);
      res.json(buildEnvelope(prepared));
    } catch (error) {
      next(error);
    }
  });

  router.post(basePath, requireAuth, (req, res, next) => {
    try {
      const { value, error } = runNormalizer(normalizeCreate, req.body, {
        mode: 'create',
        req
      });
      if (error) {
        res.status(400).json(buildEnvelope(null, error));
        return;
      }
      const record = createCollectionItem(options.collection, req.user.id, value);
      res.status(201).json(buildEnvelope(record));
    } catch (error) {
      next(error);
    }
  });

  router.put(`${basePath}/:id`, requireAuth, (req, res, next) => {
    try {
      const { value, error } = runNormalizer(normalizeUpdate, req.body, {
        mode: 'update',
        req
      });
      if (error) {
        res.status(400).json(buildEnvelope(null, error));
        return;
      }
      if (!value || Object.keys(value).length === 0) {
        res.status(400).json(buildEnvelope(null, 'No fields to update'));
        return;
      }
      const updated = updateCollectionItem(
        options.collection,
        req.user.id,
        req.params.id,
        value
      );
      if (!updated) {
        res.status(404).json(buildEnvelope(null, 'Record not found'));
        return;
      }
      res.json(buildEnvelope(updated));
    } catch (error) {
      next(error);
    }
  });

  router.delete(`${basePath}/:id`, requireAuth, (req, res, next) => {
    try {
      const removed = removeCollectionItem(
        options.collection,
        req.user.id,
        req.params.id
      );
      if (!removed) {
        res.status(404).json(buildEnvelope(null, 'Record not found'));
        return;
      }
      res.json(buildEnvelope(removed));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createCollectionRouter
};
