require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');

const authRoutes   = require('./routes/auth');
const userRoutes   = require('./routes/user');
const adminRoutes  = require('./routes/admin');
const dutiesRoutes = require('./routes/duties');
const depotRoutes  = require('./routes/depot');
const { getTranslation } = require('./i18n');

const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  },
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  const locale = req.session.user?.locale || 'en';
  res.locals.locale = locale;
  res.locals.t      = getTranslation(locale);
  next();
});

app.use('/auth',  authRoutes);
app.use('/admin', adminRoutes);
app.use('/',      dutiesRoutes);
app.use('/',      depotRoutes);
app.use('/',      userRoutes);

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('index');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`Internal server error: ${err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
