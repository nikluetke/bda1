const express     = require('express');
const router      = express.Router();
const { requireAuth } = require('../auth');
const { getUser, setPhone } = require('../db');

router.get('/dashboard', requireAuth, (req, res) => {
  const user = getUser(req.session.user.oid);
  res.render('dashboard', { user });
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

module.exports = router;
