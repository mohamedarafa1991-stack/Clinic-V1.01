
export enum Gender { Male = 'Male', Female = 'Female', Other = 'Other' }
export enum Role { Admin = 'Admin', Receptionist = 'Receptionist', Doctor = 'Doctor', Nurse = 'Nurse', Billing = 'Billing' }

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  relatedId?: string;
}

export interface DaySchedule { day: string; startTime: string; endTime: string; isWorking: boolean; }
export interface DoctorDocument { name: string; type: 'image' | 'pdf'; data: string; }

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  consultationFee: number;
  schedule: DaySchedule[];
  photo?: string;
  documents?: DoctorDocument[];
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
  dateOfBirth?: string;
}

export enum AppointmentStatus { Scheduled = 'Scheduled', CheckedIn = 'Checked In', InProgress = 'In Progress', Completed = 'Completed', Cancelled = 'Cancelled' }
export enum AppointmentType { FirstVisit = 'First Visit', Consultation = 'Consultation', FollowUp = 'Follow-up' }
export enum PaymentStatus { Pending = 'Pending', Partial = 'Partial', Paid = 'Paid' }

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  totalFee: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  queueNumber?: number;
  paymentNote?: string;
  reminderSent?: boolean;
}

export interface AppSettings {
  clinicName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  enableAutoReminders: boolean;
  specialties: string[];
  emailTemplates: { reminder: string; followup: string; }
}

export interface NotificationLog {
  id: string;
  date: string;
  recipientEmail: string;
  subject: string;
  message: string;
  type: 'Auto' | 'Manual';
}
