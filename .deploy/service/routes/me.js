const express = require('express');

const { requireAuth } = require('../auth');
const { buildEnvelope } = require('../response');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  res.json(buildEnvelope(req.user));
});

module.exports = router;
