const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../auth');
const { getAllBuses, updateBusStatus } = require('../db');

const VALID_STATUSES = ['available', 'in_service', 'maintenance'];

router.get('/depot', requireAuth, (req, res) => {
  const buses = getAllBuses();
  const rows  = {};
  buses.forEach(b => {
    if (!rows[b.depot_row]) rows[b.depot_row] = [];
    rows[b.depot_row].push(b);
  });
  res.render('depot', { buses, rows });
});

router.post('/depot/:id/status', requireAuth, (req, res) => {
  if (!req.session.user.is_admin) return res.status(403).render('403');
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).send('Invalid status');
  updateBusStatus(parseInt(req.params.id, 10), status);
  res.redirect('/depot');
});

module.exports = router;
