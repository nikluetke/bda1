const express     = require('express');
const router      = express.Router();
const { requireAuth } = require('../auth');
const { getUser, setPhone, setTheme, getUpcomingDuties } = require('../db');

router.get('/dashboard', requireAuth, (req, res) => {
  const user     = getUser(req.session.user.oid);
  const now   = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dutyEmail = user.driver_email || user.email || '';
  const upcoming = getUpcomingDuties(dutyEmail, today);
  res.render('dashboard', { user, upcomingDuties: upcoming });
});

router.get('/profile', requireAuth, (req, res) => {
  const user = getUser(req.session.user.oid);
  res.render('profile', { user, saved: false, error: null });
});

router.post('/profile', requireAuth, (req, res) => {
  const phone = (req.body.phone || '').trim();
  const phoneRegex = /^[+\d\s\-().]{0,30}$/;

  if (phone && !phoneRegex.test(phone)) {
    const user = getUser(req.session.user.oid);
    return res.render('profile', { user, saved: false, error: 'Invalid phone number format.' });
  }

  setPhone(req.session.user.oid, phone || null);
  const user = getUser(req.session.user.oid);
  res.render('profile', { user, saved: true, error: null });
});

router.post('/settings/theme', requireAuth, (req, res) => {
  const { theme } = req.body;
  if (!['light', 'dark', 'system'].includes(theme)) {
    return res.status(400).json({ error: 'invalid theme' });
  }
  setTheme(req.session.user.oid, theme);
  req.session.user.theme = theme;
  res.json({ ok: true });
});

module.exports = router;
