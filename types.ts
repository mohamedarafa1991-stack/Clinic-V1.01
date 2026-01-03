export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum Role {
  Admin = 'Admin',
  Receptionist = 'Receptionist',
  Doctor = 'Doctor',
  Nurse = 'Nurse',
  Billing = 'Billing'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In real app, never store plain text
  role: Role;
  relatedId?: string; // If role is Doctor, this links to Doctor ID
}

export interface DoctorDocument {
  name: string;
  type: 'image' | 'pdf';
  data: string; // Base64 string
}

export interface DaySchedule {
  day: string; // "Mon", "Tue", etc.
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  isWorking: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  consultationFee: number;
  // Detailed schedule array instead of simple string arrays
  schedule: DaySchedule[]; 
  bio?: string;
  photo?: string; // Base64 string for profile picture
  documents?: DoctorDocument[]; // Array of attached bio docs
}

export interface MedicalRecord {
  id: string;
  date: string;
  condition: string;
  treatment: string;
  allergies?: string;
  medications?: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string; // ISO Date YYYY-MM-DD
  age: number;
  gender: Gender;
  address: string;
  history: MedicalRecord[];
}

export enum AppointmentStatus {
  Scheduled = 'Scheduled',
  CheckedIn = 'Checked In', // Patient arrived, waiting
  InProgress = 'In Progress', // With Doctor
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: string; // ISO String YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  isPaid: boolean;
  feeSnapshot: number; // Fee at the time of booking
  reminderSent?: boolean;
  queueNumber?: number; // Daily sequential number (1, 2, 3...)
}

export interface AppSettings {
  clinicName: string;
  logo?: string; // Base64 string for logo
  primaryColor: string;
  secondaryColor: string;
  enableAutoReminders: boolean;
  emailTemplates: {
    reminder: string;
    followup: string;
  }
}

export interface NotificationLog {
  id: string;
  date: string;
  recipientEmail: string;
  subject: string;
  message: string;
  type: 'Auto' | 'Manual';
}

export interface RevenueData {
  date: string;
  amount: number;
}