const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../auth');
const { getDutiesByEmail, getUser } = require('../db');

function computeStatus(duty) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dutyDay = new Date(duty.duty_date + 'T00:00:00');

  if (dutyDay < today) return 'completed';

  if (dutyDay.getTime() === today.getTime()) {
    const now      = new Date();
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = duty.start_time.split(':').map(Number);
    const [eh, em] = duty.end_time.split(':').map(Number);
    if (nowMin > eh * 60 + em)   return 'completed';
    if (nowMin >= sh * 60 + sm)  return 'active';
  }

  return 'scheduled';
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

router.get('/duties', requireAuth, (req, res) => {
  const dbUser     = getUser(req.session.user.oid);
  const email      = dbUser.driver_email || req.session.user.email || '';
  const weekOffset = parseInt(req.query.week || '0', 10) || 0;

  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() + weekOffset * 7);

  const endDay = new Date(startDay);
  endDay.setDate(endDay.getDate() + 6);

  const raw    = getDutiesByEmail(email, isoDate(startDay), isoDate(endDay));
  const duties = raw.map(d => ({ ...d, computedStatus: computeStatus(d) }));

  const todayStr = isoDate(new Date());
  const byDate   = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    byDate[isoDate(d)] = [];
  }
  duties.forEach(d => { if (byDate[d.duty_date]) byDate[d.duty_date].push(d); });

  res.render('duties', { byDate, startDay, endDay, weekOffset, email, todayStr });
});

module.exports = router;
