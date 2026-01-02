import { Doctor, Patient, Appointment, AppointmentStatus, Gender, User, Role, AppSettings, NotificationLog } from '../types';

// Keys
const KEYS = {
  DOCTORS: 'medicore_doctors',
  PATIENTS: 'medicore_patients',
  APPOINTMENTS: 'medicore_appointments',
  USERS: 'medicore_users',
  SETTINGS: 'medicore_settings',
  NOTIFICATIONS: 'medicore_notifications',
  INIT: 'medicore_initialized_v3' // Incremented version to force reset with new users
};

// Initial Mock Data
const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'd1',
    name: 'Dr. Sarah Smith',
    specialty: 'Cardiology',
    email: 'sarah.smith@medicore.com',
    phone: '555-0101',
    consultationFee: 500, // EGP
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu'],
    startHour: '09:00',
    endHour: '17:00',
    bio: 'Senior Cardiologist with 15 years experience.'
  },
  {
    id: 'd2',
    name: 'Dr. James Wilson',
    specialty: 'Pediatrics',
    email: 'james.wilson@medicore.com',
    phone: '555-0102',
    consultationFee: 350, // EGP
    availableDays: ['Mon', 'Wed', 'Fri'],
    startHour: '10:00',
    endHour: '16:00',
    bio: 'Specialist in child healthcare and development.'
  },
  {
    id: 'd3',
    name: 'Dr. Emily Chen',
    specialty: 'Orthopedics',
    email: 'emily.chen@medicore.com',
    phone: '555-0103',
    consultationFee: 600, // EGP
    availableDays: ['Tue', 'Thu'],
    startHour: '08:00',
    endHour: '14:00'
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'Admin', // Changed from email to username
    password: 'admin123',
    role: Role.Admin
  },
  {
    id: 'u2',
    name: 'Receptionist',
    email: 'Reception', // Changed from email to username
    password: 'user123',
    role: Role.Receptionist
  },
  {
    id: 'u3',
    name: 'Dr. Sarah Smith',
    email: 'Doctor', // Changed from email to username
    password: 'doc123',
    role: Role.Doctor,
    relatedId: 'd1' // Links to Doctor ID
  }
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '01012345678',
    age: 34,
    gender: Gender.Male,
    address: '123 Cairo St',
    history: [
      { id: 'h1', date: '2023-10-01', condition: 'Hypertension', treatment: 'Prescribed medication', allergies: 'Penicillin' }
    ]
  },
  {
    id: 'p2',
    name: 'Jane Roe',
    email: 'jane@example.com',
    phone: '01123456789',
    age: 28,
    gender: Gender.Female,
    address: '456 Giza Ave',
    history: []
  }
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    doctorId: 'd1',
    patientId: 'p1',
    date: new Date().toISOString().split('T')[0], // Today
    time: '10:00',
    status: AppointmentStatus.Completed,
    isPaid: true,
    feeSnapshot: 500,
    reminderSent: true
  },
  {
    id: 'a2',
    doctorId: 'd2',
    patientId: 'p2',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '14:30',
    status: AppointmentStatus.Scheduled,
    isPaid: false,
    feeSnapshot: 350,
    reminderSent: false
  }
];

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

// Helper to init DB
export const initializeDB = () => {
  if (!localStorage.getItem(KEYS.INIT)) {
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(KEYS.INIT, 'true');
  }
  applyTheme();
};

export const applyTheme = () => {
  const settings = getSettings();
  document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
  document.documentElement.style.setProperty('--color-secondary', settings.secondaryColor);
}

// Generic Helpers
const getItems = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveItems = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};

// Doctors API
export const getDoctors = (): Doctor[] => getItems<Doctor>(KEYS.DOCTORS);
export const saveDoctor = (doctor: Doctor) => {
  const doctors = getDoctors();
  const index = doctors.findIndex(d => d.id === doctor.id);
  if (index >= 0) {
    doctors[index] = doctor;
  } else {
    doctors.push(doctor);
  }
  saveItems(KEYS.DOCTORS, doctors);
};
export const deleteDoctor = (id: string) => {
  const doctors = getDoctors().filter(d => d.id !== id);
  saveItems(KEYS.DOCTORS, doctors);
};

// Patients API
export const getPatients = (): Patient[] => getItems<Patient>(KEYS.PATIENTS);
export const savePatient = (patient: Patient) => {
  const patients = getPatients();
  const index = patients.findIndex(p => p.id === patient.id);
  if (index >= 0) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  saveItems(KEYS.PATIENTS, patients);
};
export const deletePatient = (id: string) => {
  const patients = getPatients().filter(p => p.id !== id);
  saveItems(KEYS.PATIENTS, patients);
};

// Appointments API
export const getAppointments = (): Appointment[] => getItems<Appointment>(KEYS.APPOINTMENTS);
export const saveAppointment = (appointment: Appointment) => {
  const appointments = getAppointments();
  const index = appointments.findIndex(a => a.id === appointment.id);
  if (index >= 0) {
    appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }
  saveItems(KEYS.APPOINTMENTS, appointments);
};
export const deleteAppointment = (id: string) => {
  const appointments = getAppointments().filter(a => a.id !== id);
  saveItems(KEYS.APPOINTMENTS, appointments);
};

// Users API
export const getUsers = (): User[] => getItems<User>(KEYS.USERS);
export const saveUser = (user: User) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if(index >= 0) users[index] = user;
  else users.push(user);
  saveItems(KEYS.USERS, users);
}

// Settings API
export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(KEYS.SETTINGS);
  return data ? JSON.parse(data) : INITIAL_SETTINGS;
};
export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  applyTheme();
};

// Notifications API
export const getNotifications = (): NotificationLog[] => getItems<NotificationLog>(KEYS.NOTIFICATIONS);
export const saveNotification = (log: NotificationLog) => {
  const logs = getNotifications();
  logs.unshift(log); // Add to top
  saveItems(KEYS.NOTIFICATIONS, logs);
};

// Reset
export const resetDatabase = () => {
  localStorage.clear();
  initializeDB();
  window.location.reload();
};