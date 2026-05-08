const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { getAuthCodeUrl, acquireTokenByCode } = require('../auth');
const { upsertUser } = require('../db');

router.get('/login', async (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.authState = state;
  const url = await getAuthCodeUrl(state);
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`Auth error: ${error_description || error}`);
  }
  if (state !== req.session.authState) {
    return res.status(400).send('Invalid state parameter');
  }

  const result = await acquireTokenByCode(code);
  const claims = result.idTokenClaims;

  const adminOids = (process.env.ADMIN_OIDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const is_admin  = adminOids.includes(claims.oid) ? 1 : 0;

  const user = upsertUser({
    oid:          claims.oid,
    display_name: claims.name,
    email:        claims.preferred_username || claims.email || '',
    is_admin,
  });

  req.session.authState = null;
  req.session.user = {
    oid:          user.oid,
    display_name: user.display_name,
    email:        user.email,
    is_admin:     user.is_admin,
    theme:        user.theme || 'system',
  };

  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  const logoutUrl =
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout` +
    `?post_logout_redirect_uri=${encodeURIComponent(process.env.POST_LOGOUT_REDIRECT_URI)}`;
  res.redirect(logoutUrl);
});

module.exports = router;
