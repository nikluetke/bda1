const Database = require('better-sqlite3');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const db = new Database(path.join(dataDir, 'users.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    oid          TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email        TEXT,
    phone        TEXT,
    is_admin     INTEGER NOT NULL DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try { db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'"); } catch (_) {}

const findByOid  = db.prepare('SELECT * FROM users WHERE oid = ?');
const findById   = db.prepare('SELECT * FROM users WHERE id = ?');
const listAll    = db.prepare('SELECT * FROM users ORDER BY created_at DESC');

const insert = db.prepare(`
  INSERT INTO users (oid, display_name, email, is_admin)
  VALUES (@oid, @display_name, @email, @is_admin)
`);
const updatePhone = db.prepare(`
  UPDATE users SET phone = @phone, updated_at = CURRENT_TIMESTAMP WHERE oid = @oid
`);
const adminUpdateUser = db.prepare(`
  UPDATE users
  SET display_name = @display_name,
      email        = @email,
      phone        = @phone,
      is_admin     = @is_admin,
      updated_at   = CURRENT_TIMESTAMP
  WHERE id = @id
`);
const deleteUser  = db.prepare('DELETE FROM users WHERE id = ?');
const setAdminFlag = db.prepare('UPDATE users SET is_admin = @is_admin WHERE oid = @oid');
const updateTheme  = db.prepare("UPDATE users SET theme = @theme, updated_at = CURRENT_TIMESTAMP WHERE oid = @oid");

function upsertUser({ oid, display_name, email, is_admin = 0 }) {
  const existing = findByOid.get(oid);
  if (!existing) {
    insert.run({ oid, display_name, email, is_admin });
    return findByOid.get(oid);
  }
  // Keep existing is_admin unless caller explicitly grants it
  if (is_admin && !existing.is_admin) {
    setAdminFlag.run({ is_admin: 1, oid });
  }
  return findByOid.get(oid);
}

function getUser(oid)   { return findByOid.get(oid); }
function getUserById(id) { return findById.get(id); }
function getAllUsers()   { return listAll.all(); }

function setPhone(oid, phone) {
  updatePhone.run({ oid, phone });
}

function adminUpdate({ id, display_name, email, phone, is_admin }) {
  adminUpdateUser.run({ id, display_name, email, phone: phone || null, is_admin: is_admin ? 1 : 0 });
}

function removeUser(id) {
  deleteUser.run(id);
}

function setTheme(oid, theme) {
  updateTheme.run({ oid, theme });
}

module.exports = { upsertUser, getUser, getUserById, getAllUsers, setPhone, adminUpdate, removeUser, setTheme };
