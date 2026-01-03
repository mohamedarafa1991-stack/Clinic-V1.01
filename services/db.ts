import { Doctor, Patient, Appointment, AppointmentStatus, Gender, User, Role, AppSettings, NotificationLog, DaySchedule } from '../types';

// Declare sql.js global type
declare var initSqlJs: any;

let db: any = null;
const DB_NAME = 'MediCoreDB';
const STORE_NAME = 'sqlite_store';
const DB_KEY = 'sqlite_db_binary';

// --- IndexedDB Helper (Internal) ---
// We use IndexedDB because it can hold 500MB+ vs LocalStorage's 5MB
const idbRequest = (method: 'get' | 'put', key: string, value?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      let req;
      if (method === 'get') req = store.get(key);
      else req = store.put(value, key);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      
      tx.oncomplete = () => db.close();
    };

    request.onerror = () => reject(request.error);
  });
};

// SQL Schema Definitions
const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, json_data TEXT);
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT, relatedId TEXT);
  CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, name TEXT, specialty TEXT, data_json TEXT);
  CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, data_json TEXT);
  CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, doctorId TEXT, patientId TEXT, date TEXT, time TEXT, status TEXT, isPaid INTEGER, data_json TEXT);
  CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, date TEXT, recipient TEXT, type TEXT, data_json TEXT);
`;

// Robust Loader for sql-wasm.js
const loadSqlJsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof initSqlJs !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load sql-wasm.js. Please check internet connection."));
    document.head.appendChild(script);
  });
};

// Initialize SQLite DB
export const initializeDB = async () => {
  if (db) return;

  try {
    // 1. Ensure Library Loaded (Fixes race condition)
    await loadSqlJsScript();

    // 2. Init SQL.js with WASM config
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    // 3. Load DB from IndexedDB (Fixes storage quota issues)
    const savedUint8 = await idbRequest('get', DB_KEY);
    
    if (savedUint8) {
      try {
        db = new SQL.Database(savedUint8);
      } catch (e) {
        console.error("DB Corrupt, recreating");
        db = new SQL.Database();
        db.run(TABLES_SQL);
        seedDatabase();
      }
    } else {
      db = new SQL.Database();
      db.run(TABLES_SQL);
      seedDatabase();
    }

    applyTheme();
    console.log("SQLite Database Initialized via IndexedDB");
  } catch (err) {
    console.error("SQLite Init Error", err);
    throw err;
  }
};

// Persistence: Save to IndexedDB
const persistDB = async () => {
  if (!db) return;
  try {
    const data = db.export(); // Uint8Array
    await idbRequest('put', DB_KEY, data);
  } catch (e) {
    console.error("Failed to persist database", e);
  }
};

// --- Data Access Layer ---

// Helper to sanitze params (undefined -> null) to prevent sql.js crash
const sanitize = (params: any[]) => {
  return params.map(p => (p === undefined ? null : p));
};

const query = (sql: string, params: any[] = []) => {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(sanitize(params));
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
};

const run = (sql: string, params: any[] = []) => {
  if (!db) return;
  db.run(sql, sanitize(params));
  persistDB();
};

// DOCTORS
export const getDoctors = (): Doctor[] => {
  const rows = query("SELECT data_json FROM doctors");
  return rows.map((r: any) => JSON.parse(r.data_json));
};

export const saveDoctor = (doc: Doctor) => {
  const json = JSON.stringify(doc);
  run("INSERT OR REPLACE INTO doctors (id, name, specialty, data_json) VALUES (?, ?, ?, ?)", [doc.id, doc.name, doc.specialty, json]);
};

export const deleteDoctor = (id: string) => {
  run("DELETE FROM doctors WHERE id = ?", [id]);
};

// PATIENTS
export const getPatients = (): Patient[] => {
  const rows = query("SELECT data_json FROM patients");
  return rows.map((r: any) => JSON.parse(r.data_json));
};

export const savePatient = (p: Patient) => {
  const json = JSON.stringify(p);
  run("INSERT OR REPLACE INTO patients (id, name, phone, email, data_json) VALUES (?, ?, ?, ?, ?)", [p.id, p.name, p.phone, p.email, json]);
};

export const deletePatient = (id: string) => {
  run("DELETE FROM patients WHERE id = ?", [id]);
};

// APPOINTMENTS
export const getAppointments = (): Appointment[] => {
  const rows = query("SELECT data_json FROM appointments");
  return rows.map((r: any) => JSON.parse(r.data_json));
};

export const saveAppointment = (a: Appointment) => {
  const json = JSON.stringify(a);
  const isPaidInt = a.isPaid ? 1 : 0;
  run("INSERT OR REPLACE INTO appointments (id, doctorId, patientId, date, time, status, isPaid, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
    [a.id, a.doctorId, a.patientId, a.date, a.time, a.status, isPaidInt, json]);
};

export const deleteAppointment = (id: string) => {
  run("DELETE FROM appointments WHERE id = ?", [id]);
};

// USERS
export const getUsers = (): User[] => {
  return query("SELECT * FROM users");
};

export const saveUser = (u: User) => {
  run("INSERT OR REPLACE INTO users (id, name, email, password, role, relatedId) VALUES (?, ?, ?, ?, ?, ?)", 
    [u.id, u.name, u.email, u.password, u.role, u.relatedId]);
};

export const deleteUser = (id: string) => {
  run("DELETE FROM users WHERE id = ?", [id]);
};

// SETTINGS
export const getSettings = (): AppSettings => {
  const res = query("SELECT json_data FROM settings WHERE id = 1");
  if (res.length > 0) return JSON.parse(res[0].json_data);
  return INITIAL_SETTINGS;
};

export const saveSettings = (s: AppSettings) => {
  run("INSERT OR REPLACE INTO settings (id, json_data) VALUES (1, ?)", [JSON.stringify(s)]);
  applyTheme();
};

export const applyTheme = () => {
  try {
    const settings = getSettings();
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', settings.secondaryColor);
  } catch(e) {}
}

// NOTIFICATIONS
export const getNotifications = (): NotificationLog[] => {
  const rows = query("SELECT data_json FROM notifications ORDER BY date DESC");
  return rows.map((r: any) => JSON.parse(r.data_json));
};

export const saveNotification = (log: NotificationLog) => {
  run("INSERT INTO notifications (id, date, recipient, type, data_json) VALUES (?, ?, ?, ?, ?)", 
    [log.id, log.date, log.recipientEmail, log.type, JSON.stringify(log)]);
};

// QUEUE
export const getNextQueueNumber = (date: string): number => {
  const res = query("SELECT data_json FROM appointments WHERE date = ?", [date]);
  const apps = res.map((r: any) => JSON.parse(r.data_json) as Appointment);
  if (apps.length === 0) return 1;
  const max = Math.max(...apps.map(a => a.queueNumber || 0));
  return max + 1;
};

export const resetDatabase = () => {
  // Clear IndexedDB
  const req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = () => window.location.reload();
  req.onerror = () => window.location.reload();
  localStorage.clear(); // Clear legacy
};

// SEEDING
const INITIAL_SETTINGS: AppSettings = {
  clinicName: 'MediCore Clinic',
  primaryColor: '#0f766e',
  secondaryColor: '#0d9488',
  enableAutoReminders: true,
  emailTemplates: {
    reminder: "Dear {patient_name},\n\nThis is a reminder for your appointment with {doctor_name} on {date} at {time}.\n\nPlease arrive 10 minutes early.\n\nRegards,\n{clinic_name}",
    followup: "Dear {patient_name},\n\nWe hope you are recovering well after your recent visit with {doctor_name}.\n\nPlease let us know if you have any questions.\n\nRegards,\n{clinic_name}"
  }
};

const seedDatabase = () => {
  saveSettings(INITIAL_SETTINGS);
  const users: User[] = [
    { id: 'u1', name: 'Admin User', email: 'Admin', password: 'MzIxbmltZGE=', role: Role.Admin },
    { id: 'u2', name: 'Receptionist', email: 'Reception', password: 'MzIxcmVzdQ==', role: Role.Receptionist },
    { id: 'u3', name: 'Dr. Sarah Smith', email: 'Doctor', password: 'MzIxY29k', role: Role.Doctor, relatedId: 'd1' }
  ];
  users.forEach(u => saveUser(u));
  const doctors: Doctor[] = [
    {
      id: 'd1', name: 'Dr. Sarah Smith', specialty: 'Cardiology', email: 'sarah@medicore.com', phone: '555-0101', consultationFee: 500,
      schedule: [{day:'Mon',startTime:'09:00',endTime:'17:00',isWorking:true}, {day:'Tue',startTime:'09:00',endTime:'17:00',isWorking:true}, {day:'Wed',startTime:'09:00',endTime:'17:00',isWorking:true}, {day:'Thu',startTime:'09:00',endTime:'17:00',isWorking:true}, {day:'Fri',startTime:'09:00',endTime:'17:00',isWorking:true}, {day:'Sat',startTime:'09:00',endTime:'17:00',isWorking:false}, {day:'Sun',startTime:'09:00',endTime:'17:00',isWorking:false}],
      documents: []
    }
  ];
  doctors.forEach(d => saveDoctor(d));
};