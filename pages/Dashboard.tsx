import React, { useEffect, useState } from 'react';
import { getAppointments, getDoctors, getPatients, getSettings, saveAppointment } from '../services/db';
import { Appointment, AppointmentStatus, Role, Doctor, Patient, PaymentStatus } from '../types';
import { DollarSign, Activity, CheckCircle, Clock, Play, Stethoscope, ChevronRight } from 'lucide-react';
import { formatCurrency, sendEmail, isValidTransition } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import { addDays, isSameDay, parseISO, format } from 'date-fns';
import { useToast } from '../context/ToastContext';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 transition hover:scale-105">
    <div className={`p-3 rounded-xl ${color} text-white shadow-md`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-gray-800">{value}</h3>
    </div>
  </div>
);

const DoctorQueueCard: React.FC<{
  doctor: Doctor;
  currentPatient?: Appointment & { patientName?: string };
  waitingList: (Appointment & { patientName?: string })[];
  onStatusUpdate: (app: Appointment, status: AppointmentStatus) => void;
  canOperate: boolean;
}> = ({ doctor, currentPatient, waitingList, onStatusUpdate, canOperate }) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-black text-sm">
            {doctor.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">{doctor.name}</h4>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{doctor.specialty}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-black text-gray-800">{waitingList.length}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waiting</span>
        </div>
      </div>

      {/* Active Area */}
      <div className="p-6 bg-primary/5 flex-1 flex flex-col justify-center items-center text-center border-b border-gray-100 min-h-[180px]">
        <h5 className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-4">Currently Serving</h5>
        {currentPatient ? (
          <div className="w-full animate-fade-in-up">
            <div className="inline-block bg-white text-primary text-5xl font-black px-6 py-4 rounded-2xl shadow-sm mb-3">
              #{currentPatient.queueNumber}
            </div>
            <h3 className="text-xl font-bold text-gray-800 truncate px-4">{currentPatient.patientName}</h3>
            <p className="text-xs font-medium text-gray-500 mb-4">{currentPatient.time}</p>
            
            {canOperate && (
              <button 
                onClick={() => onStatusUpdate(currentPatient, AppointmentStatus.Completed)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 transition flex items-center justify-center mx-auto"
              >
                <CheckCircle size={16} className="mr-2" /> Complete Visit
              </button>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-sm">
            <Activity size={32} className="mx-auto mb-2 opacity-20" />
            Station Idle
          </div>
        )}
      </div>

      {/* Waiting List */}
      <div className="bg-white flex-1 overflow-y-auto max-h-[300px]">
        {waitingList.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-gray-300 uppercase tracking-widest">Queue Empty</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {waitingList.map(app => (
              <div key={app.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <span className="font-black text-gray-300 text-lg w-8">#{app.queueNumber}</span>
                  <div>
                    <p className="font-bold text-gray-700 text-sm">{app.patientName}</p>
                    <p className="text-[10px] font-bold text-gray-400 flex items-center"><Clock size={10} className="mr-1"/> {app.time}</p>
                  </div>
                </div>
                {canOperate && !currentPatient && app.status !== AppointmentStatus.CheckedIn && (
                   <button 
                     onClick={() => onStatusUpdate(app, AppointmentStatus.CheckedIn)}
                     className="text-[10px] font-bold bg-gray-100 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg transition"
                   >
                     Check In
                   </button>
                )}
                {canOperate && !currentPatient && app.status === AppointmentStatus.CheckedIn && (
                   <button 
                     onClick={() => onStatusUpdate(app, AppointmentStatus.InProgress)}
                     className="text-[10px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-secondary transition flex items-center"
                   >
                     Call <ChevronRight size={12} className="ml-1"/>
                   </button>
                )}
                {canOperate && currentPatient && (
                  <span className="text-[10px] font-bold text-gray-300 uppercase">Wait</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  // Refresh Logic
  const refreshData = () => {
    const allApps = getAppointments();
    const allDocs = getDoctors();
    const allPats = getPatients();
    const settings = getSettings();
    
    setDoctors(allDocs);
    setPatients(allPats);

    // 1. Run Auto-Reminder Logic
    if (settings.enableAutoReminders) {
      const tomorrow = addDays(new Date(), 1);
      allApps.forEach(app => {
        if (
          !app.reminderSent && 
          app.status === AppointmentStatus.Scheduled &&
          isSameDay(parseISO(app.date), tomorrow)
        ) {
          const pat = allPats.find(p => p.id === app.patientId);
          const doc = allDocs.find(d => d.id === app.doctorId);
          
          if (pat && doc && pat.email) {
            let body = settings.emailTemplates.reminder;
            body = body.replace('{patient_name}', pat.name)
                       .replace('{doctor_name}', doc.name)
                       .replace('{date}', app.date)
                       .replace('{time}', app.time)
                       .replace('{clinic_name}', settings.clinicName);
            
            sendEmail(pat.email, `Appointment Reminder: ${app.date}`, body, 'Auto');
            app.reminderSent = true;
            saveAppointment(app);
          }
        }
      });
    }

    // 2. Filter Data based on Role
    let visibleApps = allApps;
    if (user?.role === Role.Doctor && user.relatedId) {
      visibleApps = allApps.filter(a => a.doctorId === user.relatedId);
    }
    setAppointments(visibleApps);

    // 3. Calc Revenue (Sum of amountPaid for today's appointments)
    const todayStr = new Date().toISOString().split('T')[0];
    const revenue = visibleApps
      .filter(a => a.date === todayStr)
      .reduce((sum, a) => sum + (a.amountPaid || 0), 0);
    setTodayRevenue(revenue);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const updateStatus = (app: Appointment, status: AppointmentStatus) => {
    saveAppointment({ ...app, status });
    refreshData();
    showToast(`Status updated to ${status}`, 'success');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter(a => a.date === todayStr);

  const completedCount = todaysAppointments.filter(a => a.status === AppointmentStatus.Completed).length;
  const waitingCount = todaysAppointments.filter(a => [AppointmentStatus.Scheduled, AppointmentStatus.CheckedIn].includes(a.status)).length;

  // Active Doctors Logic: Doctors who have appointments today or are scheduled to work
  const activeDoctorIds = Array.from(new Set(todaysAppointments.map(a => a.doctorId)));
  // Also include doctors who are scheduled today even if no appointments yet, for the view
  const currentDayName = format(new Date(), 'EEE');
  const scheduledDoctors = doctors.filter(d => d.schedule.some(s => s.day === currentDayName && s.isWorking)).map(d => d.id);
  const relevantDoctorIds = Array.from(new Set([...activeDoctorIds, ...scheduledDoctors]));
  
  const relevantDoctors = doctors.filter(d => relevantDoctorIds.includes(d.id));

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Clinical Operations</h2>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do, yyyy')}</span>
        </div>
        <div className="flex space-x-3">
           <a href="#/appointments" className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-secondary transition flex items-center">
             <Clock size={18} className="mr-2"/> Queue Patient
           </a>
        </div>
      </div>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Waiting" 
          value={waitingCount} 
          icon={<Clock size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Completed" 
          value={completedCount} 
          icon={<CheckCircle size={24} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Active Clinics" 
          value={relevantDoctors.length} 
          icon={<Stethoscope size={24} />} 
          color="bg-teal-500" 
        />
        {user?.role === Role.Admin && (
          <StatCard 
            title="Today's Revenue" 
            value={formatCurrency(todayRevenue)} 
            icon={<DollarSign size={24} />} 
            color="bg-amber-500" 
          />
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center">
          <Activity size={24} className="mr-2 text-primary" /> Live Stations
        </h3>
        
        {relevantDoctors.length === 0 ? (
           <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-gray-200">
             <p className="text-gray-400 font-bold">No active clinics or scheduled doctors for today.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {relevantDoctors.map(doc => {
              const docApps = todaysAppointments.filter(a => a.doctorId === doc.id);
              const current = docApps.find(a => a.status === AppointmentStatus.InProgress);
              const waiting = docApps
                .filter(a => [AppointmentStatus.Scheduled, AppointmentStatus.CheckedIn].includes(a.status))
                .sort((a,b) => (a.queueNumber || 999) - (b.queueNumber || 999))
                .map(a => ({...a, patientName: patients.find(p => p.id === a.patientId)?.name || 'Unknown'}));
              
              const currentWithMeta = current ? {...current, patientName: patients.find(p => p.id === current.patientId)?.name || 'Unknown'} : undefined;
              
              // Only allow operations if Admin, Receptionist, or the specific Doctor
              const canOperate = user?.role === Role.Admin || user?.role === Role.Receptionist || (user?.role === Role.Doctor && user.relatedId === doc.id);

              return (
                <DoctorQueueCard 
                  key={doc.id}
                  doctor={doc}
                  currentPatient={currentWithMeta}
                  waitingList={waiting}
                  onStatusUpdate={updateStatus}
                  canOperate={canOperate}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;