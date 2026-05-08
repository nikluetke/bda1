const express      = require('express');
const router       = express.Router();
const { requireAdmin } = require('../auth');
const { getAllUsers, getUserById, adminUpdate, removeUser, getAllDuties, setDriverEmail, getDriverEmails } = require('../db');

router.use(requireAdmin);

router.get('/', (req, res) => {
  const users = getAllUsers();
  res.render('admin/users', { users, currentOid: req.session.user.oid });
});

router.get('/users/:id/edit', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.render('admin/edit', { user, driverEmails: getDriverEmails(), saved: false, errorKey: null });
});

router.post('/users/:id/edit', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).send('User not found');

  const { display_name, email, phone, is_admin, driver_email } = req.body;
  const phoneRegex = /^[+\d\s\-().]{0,30}$/;

  if (phone && !phoneRegex.test(phone)) {
    return res.render('admin/edit', { user, driverEmails: getDriverEmails(), saved: false, errorKey: 'error_phone_format' });
  }

  adminUpdate({
    id:           user.id,
    display_name: (display_name || '').trim(),
    email:        (email || '').trim(),
    phone:        (phone || '').trim() || null,
    is_admin:     is_admin === 'on' ? 1 : 0,
  });
  setDriverEmail(user.id, (driver_email || '').trim() || null);

  const updated = getUserById(user.id);
  res.render('admin/edit', { user: updated, driverEmails: getDriverEmails(), saved: true, errorKey: null });
});

router.post('/users/:id/delete', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).send('User not found');
  if (user.oid === req.session.user.oid) return res.redirect('/admin?error=self-delete');
  removeUser(user.id);
  res.redirect('/admin');
});

router.get('/duties', (req, res) => {
  const duties = getAllDuties();
  res.render('admin/duties', { duties });
});

module.exports = router;
