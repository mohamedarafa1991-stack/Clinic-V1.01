import { Doctor, Patient, Appointment, User, Role, AppSettings, NotificationLog, AppointmentStatus, AppointmentType, PaymentStatus, Gender } from '../types';

declare var initSqlJs: any;
let db: any = null;
const DB_NAME = 'MediCore_Relational_V5';
const STORE_NAME = 'sqlite_binary_store';
const DB_KEY = 'production_snapshot_v5';

const DEFAULT_SPECIALTIES = [
  "Anesthesiology", "Cardiology", "Dermatology", "Emergency Medicine", "Endocrinology",
  "ENT (Otolaryngology)", "Gastroenterology", "General Practice", "General Surgery", 
  "Geriatrics", "Hematology", "Infectious Diseases", "Internal Medicine", "Nephrology", 
  "Neurology", "Obstetrics & Gynecology", "Oncology", "Ophthalmology", "Orthopedics", 
  "Pediatrics", "Physical Medicine & Rehab", "Psychiatry", "Pulmonology", "Radiology", 
  "Rheumatology", "Urology"
].sort();

const INITIAL_SETTINGS: AppSettings = {
  clinicName: 'MediCore Clinical Center',
  primaryColor: '#0f766e',
  secondaryColor: '#0d9488',
  enableAutoReminders: true,
  specialties: DEFAULT_SPECIALTIES,
  emailTemplates: {
    reminder: "Dear {patient_name},\n\nThis is a friendly reminder for your appointment at {clinic_name} on {date} at {time} with {doctor_name}.\n\nPlease arrive 10 minutes early.",
    followup: "Dear {patient_name},\n\nWe hope you are recovering well after your visit with {doctor_name}.\n\nPlease let us know if you have any further questions.\n\nBest regards,\n{clinic_name}"
  }
};

const idbRequest = (method: 'get' | 'put', key: string, value?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
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
  try {
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
  } catch (error) {
    console.error("Critical DB Init Error:", error);
    throw error;
  }
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

export const exportDatabaseBinary = (): Uint8Array => {
  if (!db) throw new Error("DB Offline");
  return db.export();
};

export const importDatabaseBinary = async (data: Uint8Array) => {
  await idbRequest('put', DB_KEY, data);
  window.location.reload();
};

const getAll = (table: string) => {
  if (!db) return [];
  try {
    const res = db.exec(`SELECT data FROM ${table}`);
    return res.length > 0 ? res[0].values.map((v: any) => JSON.parse(v[0])) : [];
  } catch (e) {
    console.error(`Error fetching ${table}`, e);
    return [];
  }
};

const saveItem = (table: string, id: string, item: any) => {
  if (!db) return;
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
  if (!db) return INITIAL_SETTINGS;
  const res = db.exec(`SELECT data FROM settings WHERE id = 1`);
  if (res.length > 0) {
    const data = JSON.parse(res[0].values[0][0]);
    if (!data.specialties) data.specialties = DEFAULT_SPECIALTIES;
    return data;
  }
  return INITIAL_SETTINGS;
};
export const saveSettings = (s: AppSettings) => { saveItem('settings', '1', s); applyTheme(); };

export const getNotifications = (): NotificationLog[] => getAll('notifications');
export const saveNotification = (n: NotificationLog) => saveItem('notifications', n.id, n);

export const getNextQueueNumber = (date: string, doctorId?: string): number => {
  let apps = getAppointments().filter(a => a.date === date);
  // Separate queues per doctor to ensure distinct numbering
  if (doctorId) {
    apps = apps.filter(a => a.doctorId === doctorId);
  }
  return apps.length === 0 ? 1 : Math.max(...apps.map(a => a.queueNumber || 0)) + 1;
};

export const resetDatabase = () => {
  indexedDB.deleteDatabase(DB_NAME);
  window.location.reload();
};

const seedDatabase = () => {
  saveSettings(INITIAL_SETTINGS);
  
  // Seed Users
  saveUser({ id: 'u1', name: 'Super Admin', email: 'Admin', password: 'MzIxbmltZGE=', role: Role.Admin });
  saveUser({ id: 'u2', name: 'Front Desk', email: 'Reception', password: 'MzIxcmVzdQ==', role: Role.Receptionist });

  // Seed Doctors
  const docs: Doctor[] = [
    {
      id: 'd1', name: 'Dr. Sarah Mitchell', specialty: 'Cardiology', email: 'sarah.m@clinic.com', phone: '+20 100 234 5678', consultationFee: 500, bio: 'Senior cardiologist with 15 years experience in diagnostic cardiology.',
      schedule: [
        { day: 'Mon', startTime: '09:00', endTime: '14:00', isWorking: true },
        { day: 'Wed', startTime: '09:00', endTime: '14:00', isWorking: true },
        { day: 'Fri', startTime: '09:00', endTime: '14:00', isWorking: true },
        { day: 'Tue', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Thu', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Sat', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Sun', startTime: '09:00', endTime: '17:00', isWorking: false }
      ],
      documents: []
    },
    {
      id: 'd2', name: 'Dr. James Wilson', specialty: 'Pediatrics', email: 'j.wilson@clinic.com', phone: '+20 111 888 9999', consultationFee: 350, bio: 'Specializing in neonatal care and developmental pediatrics.',
      schedule: [
        { day: 'Tue', startTime: '10:00', endTime: '17:00', isWorking: true },
        { day: 'Thu', startTime: '10:00', endTime: '17:00', isWorking: true },
        { day: 'Mon', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Wed', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Fri', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Sat', startTime: '09:00', endTime: '17:00', isWorking: false },
        { day: 'Sun', startTime: '09:00', endTime: '17:00', isWorking: false }
      ],
      documents: []
    }
  ];
  docs.forEach(d => saveDoctor(d));

  // Seed Patients
  const pats: Patient[] = [
    { id: 'p1', name: 'John Doe', age: 45, dateOfBirth: '1979-05-15', gender: Gender.Male, phone: '+20 122 333 4444', email: 'john@example.com', address: '123 Nile St, Cairo', history: [{ id: 'h1', date: '2023-10-01', condition: 'Hypertension', treatment: 'Prescribed Lisinopril 10mg daily.', allergies: 'None', medications: 'Lisinopril' }] },
    { id: 'p2', name: 'Emma Smith', age: 28, dateOfBirth: '1996-08-22', gender: Gender.Female, phone: '+20 155 666 7777', email: 'emma@example.com', address: '45 Pyramids Rd, Giza', history: [] }
  ];
  pats.forEach(p => savePatient(p));

  // Seed Appointments
  const today = new Date().toISOString().split('T')[0];
  const apps: Appointment[] = [
    { id: 'a1', doctorId: 'd1', patientId: 'p1', date: today, time: '09:00', status: AppointmentStatus.CheckedIn, type: AppointmentType.Consultation, totalFee: 500, amountPaid: 500, paymentStatus: PaymentStatus.Paid, queueNumber: 1, reminderSent: true },
    { id: 'a2', doctorId: 'd2', patientId: 'p2', date: today, time: '10:30', status: AppointmentStatus.Scheduled, type: AppointmentType.FirstVisit, totalFee: 350, amountPaid: 0, paymentStatus: PaymentStatus.Pending, queueNumber: 1, reminderSent: false }
  ];
  apps.forEach(a => saveAppointment(a));
};