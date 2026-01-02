export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other'
}

export enum Role {
  Admin = 'Admin',
  Receptionist = 'Receptionist',
  Doctor = 'Doctor'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In real app, never store plain text
  role: Role;
  relatedId?: string; // If role is Doctor, this links to Doctor ID
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  consultationFee: number;
  availableDays: string[]; // ["Mon", "Wed", "Fri"]
  startHour: string; // "09:00"
  endHour: string; // "17:00"
  bio?: string;
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
  age: number;
  gender: Gender;
  address: string;
  history: MedicalRecord[];
}

export enum AppointmentStatus {
  Scheduled = 'Scheduled',
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
}

export interface AppSettings {
  clinicName: string;
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
