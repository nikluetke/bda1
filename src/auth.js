const msal = require('@azure/msal-node');

let _pca;

function getPca() {
  if (!_pca) {
    _pca = new msal.ConfidentialClientApplication({
      auth: {
        clientId:     process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority:    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
    });
  }
  return _pca;
}

const SCOPES = ['openid', 'profile', 'email', 'User.Read'];

async function getAuthCodeUrl(state) {
  return getPca().getAuthCodeUrl({
    scopes:      SCOPES,
    redirectUri: process.env.REDIRECT_URI,
    state,
  });
}

async function acquireTokenByCode(code) {
  const result = await getPca().acquireTokenByCode({
    code,
    scopes:      SCOPES,
    redirectUri: process.env.REDIRECT_URI,
  });
  return result;
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  if (!req.session.user.is_admin) return res.status(403).render('403');
  next();
}

module.exports = { getAuthCodeUrl, acquireTokenByCode, requireAuth, requireAdmin };
