const Database = require('better-sqlite3');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const db = new Database(path.join(dataDir, 'users.db'));

// ── Users ─────────────────────────────────────────────────────
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
try { db.exec('ALTER TABLE users ADD COLUMN driver_email TEXT'); } catch (_) {}

// ── Buses ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS buses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    fleet_number TEXT UNIQUE NOT NULL,
    model        TEXT,
    depot_row    TEXT,
    depot_spot   INTEGER,
    status       TEXT NOT NULL DEFAULT 'available'
  )
`);

// ── Duties ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS duties (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_email   TEXT NOT NULL,
    bus_id         INTEGER REFERENCES buses(id),
    duty_date      TEXT NOT NULL,
    start_time     TEXT NOT NULL,
    end_time       TEXT NOT NULL,
    route          TEXT,
    start_location TEXT,
    end_location   TEXT,
    notes          TEXT
  )
`);

// ── Mock data seed (runs once on first start) ─────────────────
(function seedMockData() {
  if (db.prepare('SELECT COUNT(*) as c FROM buses').get().c > 0) return;

  const insertBus = db.prepare(`
    INSERT INTO buses (fleet_number, model, depot_row, depot_spot, status)
    VALUES (@fleet_number, @model, @depot_row, @depot_spot, @status)
  `);

  const mockBuses = [
    { fleet_number: 'B-HVG 101', model: "MAN Lion's City G",      depot_row: 'A', depot_spot: 1, status: 'available'   },
    { fleet_number: 'B-HVG 102', model: 'Mercedes-Benz Citaro',    depot_row: 'A', depot_spot: 2, status: 'in_service'  },
    { fleet_number: 'B-HVG 103', model: "MAN Lion's City",         depot_row: 'B', depot_spot: 1, status: 'available'   },
    { fleet_number: 'B-HVG 104', model: 'Setra S 415 NF',          depot_row: 'B', depot_spot: 2, status: 'maintenance' },
    { fleet_number: 'B-HVG 105', model: 'Mercedes-Benz Citaro C2', depot_row: 'C', depot_spot: 1, status: 'available'   },
  ];
  mockBuses.forEach(b => insertBus.run(b));

  const busIds = mockBuses.map(b =>
    db.prepare('SELECT id FROM buses WHERE fleet_number = ?').get(b.fleet_number).id
  );

  const drivers = [
    'anna.schmidt@buscompany.de',
    'thomas.mueller@buscompany.de',
    'sarah.weber@buscompany.de',
    'michael.bauer@buscompany.de',
    'lisa.fischer@buscompany.de',
  ];

  const routes = [
    { route: 'Linie 42', start_location: 'Hauptbahnhof',  end_location: 'Westpark'        },
    { route: 'Linie 7',  start_location: 'Marktplatz',    end_location: 'Flughafen'        },
    { route: 'Linie 15', start_location: 'Nordring',      end_location: 'Südring'          },
    { route: 'Linie 23', start_location: 'Stadtmitte',    end_location: 'Technologiepark'  },
    { route: 'Linie 8',  start_location: 'Bahnhof Mitte', end_location: 'Universität'      },
  ];

  // Each driver has 3 duty slots; day 0/3/6 gets all 3, other days get 2
  const patterns = [
    [ // Anna Schmidt – early shifts
      { start: '05:45', end: '09:30', bus: 0, route: 0 },
      { start: '10:15', end: '14:30', bus: 2, route: 4 },
      { start: '15:00', end: '19:00', bus: 4, route: 2 },
    ],
    [ // Thomas Müller – daytime
      { start: '07:00', end: '10:45', bus: 1, route: 1 },
      { start: '12:00', end: '15:30', bus: 3, route: 2 },
      { start: '17:00', end: '21:00', bus: 4, route: 3 },
    ],
    [ // Sarah Weber – afternoon/evening
      { start: '13:00', end: '17:00', bus: 2, route: 3 },
      { start: '17:30', end: '21:45', bus: 0, route: 0 },
      { start: '09:30', end: '12:30', bus: 3, route: 1 },
    ],
    [ // Michael Bauer – midday
      { start: '09:00', end: '13:00', bus: 1, route: 2 },
      { start: '14:00', end: '18:30', bus: 4, route: 4 },
      { start: '06:30', end: '08:30', bus: 0, route: 1 },
    ],
    [ // Lisa Fischer – mixed
      { start: '06:30', end: '10:30', bus: 0, route: 1 },
      { start: '11:00', end: '15:00', bus: 2, route: 0 },
      { start: '15:30', end: '19:30', bus: 1, route: 3 },
    ],
  ];

  const insertDuty = db.prepare(`
    INSERT INTO duties (driver_email, bus_id, duty_date, start_time, end_time, route, start_location, end_location)
    VALUES (@driver_email, @bus_id, @duty_date, @start_time, @end_time, @route, @start_location, @end_location)
  `);

  function localDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOff = 0; dayOff < 7; dayOff++) {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOff);
    const duty_date = localDate(d);

    drivers.forEach((email, di) => {
      const pts   = patterns[di];
      const count = (dayOff % 3 === di % 3) ? 3 : 2;
      for (let j = 0; j < count; j++) {
        const p = pts[j];
        const r = routes[p.route];
        insertDuty.run({
          driver_email:   email,
          bus_id:         busIds[p.bus],
          duty_date,
          start_time:     p.start,
          end_time:       p.end,
          route:          r.route,
          start_location: r.start_location,
          end_location:   r.end_location,
        });
      }
    });
  }
})();

// ── Prepared statements ───────────────────────────────────────
const findByOid      = db.prepare('SELECT * FROM users WHERE oid = ?');
const findById       = db.prepare('SELECT * FROM users WHERE id = ?');
const listAll        = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
const insert         = db.prepare('INSERT INTO users (oid, display_name, email, is_admin) VALUES (@oid, @display_name, @email, @is_admin)');
const updatePhone    = db.prepare('UPDATE users SET phone = @phone, updated_at = CURRENT_TIMESTAMP WHERE oid = @oid');
const adminUpdateUser = db.prepare(`
  UPDATE users SET display_name=@display_name, email=@email, phone=@phone, is_admin=@is_admin, updated_at=CURRENT_TIMESTAMP WHERE id=@id
`);
const deleteUser     = db.prepare('DELETE FROM users WHERE id = ?');
const setAdminFlag   = db.prepare('UPDATE users SET is_admin = @is_admin WHERE oid = @oid');
const updateTheme    = db.prepare("UPDATE users SET theme = @theme, updated_at = CURRENT_TIMESTAMP WHERE oid = @oid");

const setDriverEmailStmt   = db.prepare('UPDATE users SET driver_email = @driver_email WHERE id = @id');
const listDriverEmails     = db.prepare('SELECT DISTINCT driver_email FROM duties ORDER BY driver_email');

const listBuses      = db.prepare('SELECT * FROM buses ORDER BY depot_row, depot_spot');
const updateBusStmt  = db.prepare('UPDATE buses SET status = @status WHERE id = @id');

const dutiesByEmail  = db.prepare(`
  SELECT d.*, b.fleet_number, b.model
  FROM duties d LEFT JOIN buses b ON d.bus_id = b.id
  WHERE d.driver_email = ? AND d.duty_date BETWEEN ? AND ?
  ORDER BY d.duty_date, d.start_time
`);
const upcomingStmt   = db.prepare(`
  SELECT d.*, b.fleet_number, b.model
  FROM duties d LEFT JOIN buses b ON d.bus_id = b.id
  WHERE d.driver_email = ? AND d.duty_date >= ?
  ORDER BY d.duty_date, d.start_time LIMIT 3
`);
const allDutiesStmt  = db.prepare(`
  SELECT d.*, b.fleet_number, b.model
  FROM duties d LEFT JOIN buses b ON d.bus_id = b.id
  ORDER BY d.duty_date, d.start_time, d.driver_email
`);

// ── User functions ────────────────────────────────────────────
function upsertUser({ oid, display_name, email, is_admin = 0 }) {
  const existing = findByOid.get(oid);
  if (!existing) {
    insert.run({ oid, display_name, email, is_admin });
    return findByOid.get(oid);
  }
  if (is_admin && !existing.is_admin) setAdminFlag.run({ is_admin: 1, oid });
  return findByOid.get(oid);
}

function getUser(oid)    { return findByOid.get(oid); }
function getUserById(id) { return findById.get(id); }
function getAllUsers()    { return listAll.all(); }
function setPhone(oid, phone)  { updatePhone.run({ oid, phone }); }
function adminUpdate({ id, display_name, email, phone, is_admin }) {
  adminUpdateUser.run({ id, display_name, email, phone: phone || null, is_admin: is_admin ? 1 : 0 });
}
function removeUser(id) { deleteUser.run(id); }
function setTheme(oid, theme)  { updateTheme.run({ oid, theme }); }

function setDriverEmail(id, driver_email) {
  setDriverEmailStmt.run({ driver_email: driver_email || null, id });
}
function getDriverEmails() { return listDriverEmails.all().map(r => r.driver_email); }

// ── Bus functions ─────────────────────────────────────────────
function getAllBuses()              { return listBuses.all(); }
function updateBusStatus(id, status) { updateBusStmt.run({ status, id }); }

// ── Duty functions ────────────────────────────────────────────
function getDutiesByEmail(email, start, end) { return dutiesByEmail.all(email, start, end); }
function getUpcomingDuties(email, fromDate)  { return upcomingStmt.all(email, fromDate); }
function getAllDuties()                        { return allDutiesStmt.all(); }

module.exports = {
  upsertUser, getUser, getUserById, getAllUsers, setPhone, adminUpdate, removeUser, setTheme,
  setDriverEmail, getDriverEmails,
  getAllBuses, updateBusStatus,
  getDutiesByEmail, getUpcomingDuties, getAllDuties,
};
