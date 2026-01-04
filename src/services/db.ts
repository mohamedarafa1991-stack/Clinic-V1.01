
import { Doctor, Patient, Appointment, User, Role, AppSettings, NotificationLog } from '../types';

declare var initSqlJs: any;
let db: any = null;
const DB_NAME = 'MediCoreDB';
const STORE_NAME = 'sqlite_store';
const DB_KEY = 'sqlite_db_binary';

const DEFAULT_SPECIALTIES = [
  "Anesthesiology", "Cardiology", "Dermatology", "Emergency Medicine", "Endocrinology",
  "ENT (Otolaryngology)", "Gastroenterology", "General Practice", "General Surgery", 
  "Geriatrics", "Hematology", "Infectious Diseases", "Internal Medicine", "Nephrology", 
  "Neurology", "Obstetrics & Gynecology", "Oncology", "Ophthalmology", "Orthopedics", 
  "Pediatrics", "Physical Medicine & Rehab", "Psychiatry", "Pulmonology", "Radiology", 
  "Rheumatology", "Urology"
].sort();

const INITIAL_SETTINGS: AppSettings = {
  clinicName: 'MediCore Clinic',
  primaryColor: '#0f766e',
  secondaryColor: '#0d9488',
  enableAutoReminders: true,
  specialties: DEFAULT_SPECIALTIES,
  emailTemplates: {
    reminder: "Dear {patient_name}, this is a reminder for your appointment on {date} at {time}.",
    followup: "Dear {patient_name}, hope you are well after your visit with {doctor_name}."
  }
};

const idbRequest = (method: 'get' | 'put', key: string, value?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = method === 'get' ? store.get(key) : store.put(value, key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    };
    request.onerror = () => reject(request.error);
  });
};

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, data TEXT);
  CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, data TEXT);
`;

export const initializeDB = async () => {
  if (db) return;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  const savedUint8 = await idbRequest('get', DB_KEY);
  db = savedUint8 ? new SQL.Database(savedUint8) : new SQL.Database();
  
  if (!savedUint8) {
    db.run(TABLES_SQL);
    seedDatabase();
  }
  
  applyTheme();
};

const persistDB = async () => {
  if (!db) return;
  const data = db.export(); 
  await idbRequest('put', DB_KEY, data);
};

const applyTheme = () => {
  const s = getSettings();
  document.documentElement.style.setProperty('--color-primary', s.primaryColor);
  document.documentElement.style.setProperty('--color-secondary', s.secondaryColor);
};

// Backup/Maintenance
export const exportDatabaseBinary = (): Uint8Array => {
  if (!db) throw new Error("Database not initialized");
  return db.export();
};

export const importDatabaseBinary = async (data: Uint8Array) => {
  await idbRequest('put', DB_KEY, data);
  window.location.reload();
};

// Generic Repository
const getAll = (table: string) => {
  const res = db.exec(`SELECT data FROM ${table}`);
  return res.length > 0 ? res[0].values.map((v: any) => JSON.parse(v[0])) : [];
};

const saveItem = (table: string, id: string, item: any) => {
  db.run(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`, [id, JSON.stringify(item)]);
  persistDB();
};

export const getDoctors = (): Doctor[] => getAll('doctors');
export const saveDoctor = (d: Doctor) => saveItem('doctors', d.id, d);
export const deleteDoctor = (id: string) => { db.run(`DELETE FROM doctors WHERE id = ?`, [id]); persistDB(); };

export const getPatients = (): Patient[] => getAll('patients');
export const savePatient = (p: Patient) => saveItem('patients', p.id, p);
export const deletePatient = (id: string) => { db.run(`DELETE FROM patients WHERE id = ?`, [id]); persistDB(); };

export const getAppointments = (): Appointment[] => getAll('appointments');
export const saveAppointment = (a: Appointment) => saveItem('appointments', a.id, a);
export const deleteAppointment = (id: string) => { db.run(`DELETE FROM appointments WHERE id = ?`, [id]); persistDB(); };

export const getUsers = (): User[] => getAll('users');
export const saveUser = (u: User) => saveItem('users', u.id, u);
export const deleteUser = (id: string) => { db.run(`DELETE FROM users WHERE id = ?`, [id]); persistDB(); };

export const getSettings = (): AppSettings => {
  const res = db.exec(`SELECT data FROM settings WHERE id = 1`);
  if (res.length > 0) {
      const s = JSON.parse(res[0].values[0][0]);
      if (!s.specialties) s.specialties = DEFAULT_SPECIALTIES;
      return s;
  }
  return INITIAL_SETTINGS;
};
export const saveSettings = (s: AppSettings) => { saveItem('settings', '1', s); applyTheme(); };

export const getNotifications = (): NotificationLog[] => getAll('notifications');
export const saveNotification = (n: NotificationLog) => saveItem('notifications', n.id, n);

export const getNextQueueNumber = (date: string): number => {
  const apps = getAppointments().filter(a => a.date === date);
  return apps.length === 0 ? 1 : Math.max(...apps.map(a => a.queueNumber || 0)) + 1;
};

export const resetDatabase = () => {
  indexedDB.deleteDatabase(DB_NAME);
  window.location.reload();
};

const seedDatabase = () => {
  saveSettings(INITIAL_SETTINGS);
  saveUser({ id: 'u1', name: 'Super Admin', email: 'Admin', password: 'MzIxbmltZGE=', role: Role.Admin });
  saveUser({ id: 'u2', name: 'Front Desk', email: 'Reception', password: 'MzIxcmVzdQ==', role: Role.Receptionist });
};
