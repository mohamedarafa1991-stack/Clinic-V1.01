import React, { useEffect, useState } from 'react';
import { getAppointments, getDoctors, getPatients, getSettings, saveAppointment } from '../services/db';
import { Appointment, AppointmentStatus, Role, Doctor, Patient } from '../types';
import { Users, Calendar, DollarSign, Activity, CheckCircle, Clock, Play, AlertCircle, Stethoscope } from 'lucide-react';
import { formatCurrency, sendEmail } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import { addDays, isSameDay, parseISO, format } from 'date-fns';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4 transition hover:scale-105">
    <div className={`p-3 rounded-full ${color} text-white shadow-md`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [doctorCount, setDoctorCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Time state for live updates
  const [now, setNow] = useState(new Date());

  // Refresh Logic
  const refreshData = () => {
    const allApps = getAppointments();
    const allDocs = getDoctors();
    const allPats = getPatients();
    const settings = getSettings();
    
    setDoctors(allDocs);
    setPatients(allPats);
    setPatientCount(allPats.length);
    setDoctorCount(allDocs.length);

    // 1. Run Auto-Reminder Logic (Once per session usually, but strictly safe here)
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

    const todayStr = new Date().toISOString().split('T')[0];
    const revenue = visibleApps
      .filter(a => a.date === todayStr && a.isPaid)
      .reduce((sum, a) => sum + (a.feeSnapshot || 0), 0);
    setTodayRevenue(revenue);
    
    setNow(new Date());
  };

  useEffect(() => {
    refreshData();
    // Auto-refresh dashboard every 30 seconds for live queue feel
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const updateStatus = (app: Appointment, status: AppointmentStatus) => {
    saveAppointment({ ...app, status });
    refreshData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments
    .filter(a => a.date === todayStr)
    .sort((a,b) => (a.queueNumber || 999) - (b.queueNumber || 999));

  const currentPatient = todaysAppointments.find(a => a.status === AppointmentStatus.InProgress);
  const waitingPatients = todaysAppointments.filter(a => a.status === AppointmentStatus.CheckedIn || a.status === AppointmentStatus.Scheduled);
  const completedPatients = todaysAppointments.filter(a => a.status === AppointmentStatus.Completed);

  // Calculate Active Doctors
  const currentDay = format(now, 'EEE'); // "Mon", "Tue"
  const currentTimeStr = format(now, 'HH:mm'); // "14:30"

  const activeDoctors = doctors.filter(doc => {
    const schedule = doc.schedule.find(s => s.day === currentDay);
    if (!schedule || !schedule.isWorking) return false;
    return currentTimeStr >= schedule.startTime && currentTimeStr <= schedule.endTime;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        Live Queue Dashboard
        <span className="text-sm font-normal text-gray-500 ml-2">({new Date().toLocaleDateString()})</span>
      </h2>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Patients Waiting" 
          value={waitingPatients.length} 
          icon={<Clock size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Completed Today" 
          value={completedPatients.length} 
          icon={<CheckCircle size={24} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Doctors Available" 
          value={activeDoctors.length} 
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Queue Board */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Serving Card */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-primary overflow-hidden">
            <div className="p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Currently Serving</h3>
              {currentPatient ? (
                <div className="flex justify-between items-center">
                   <div className="flex items-center space-x-6">
                      <div className="bg-primary text-white text-5xl font-bold p-6 rounded-lg min-w-[120px] text-center shadow-inner">
                        #{currentPatient.queueNumber}
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-gray-800 mb-1">{patients.find(p => p.id === currentPatient.patientId)?.name}</h4>
                        <p className="text-lg text-primary">{doctors.find(d => d.id === currentPatient.doctorId)?.name}</p>
                        <p className="text-sm text-gray-500 mt-1 flex items-center"><Clock size={14} className="mr-1"/> Appointment Time: {currentPatient.time}</p>
                      </div>
                   </div>
                   <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => updateStatus(currentPatient, AppointmentStatus.Completed)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded shadow transition flex items-center justify-center"
                      >
                        <CheckCircle size={20} className="mr-2" /> Complete Visit
                      </button>
                   </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Activity size={48} className="mr-4 opacity-50" />
                  <span className="text-xl">No patient currently in consultation. Call the next one!</span>
                </div>
              )}
            </div>
          </div>

          {/* Waiting List Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-800">Waiting Queue</h3>
               <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{waitingPatients.length} Waiting</span>
            </div>
            
            {waitingPatients.length === 0 ? (
               <div className="p-8 text-center text-gray-500">Queue is empty.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="text-xs text-gray-500 bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Queue #</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Doctor</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {waitingPatients.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-bold text-lg text-primary">#{app.queueNumber}</td>
                      <td className="px-6 py-4 font-mono text-sm">{app.time}</td>
                      <td className="px-6 py-4 font-medium">{patients.find(p => p.id === app.patientId)?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doctors.find(d => d.id === app.doctorId)?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          app.status === AppointmentStatus.CheckedIn ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                           onClick={() => updateStatus(app, AppointmentStatus.InProgress)}
                           className="text-white bg-primary hover:bg-secondary px-3 py-1 rounded text-xs flex items-center ml-auto"
                           disabled={!!currentPatient && user?.role === Role.Doctor} 
                        >
                           <Play size={12} className="mr-1" /> Call In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Quick Stats / Status */}
        <div className="space-y-6">
           
           {/* Active Doctors */}
           <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                 <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                 Doctors On Duty
              </h3>
              {activeDoctors.length === 0 ? (
                <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">
                  No doctors are currently scheduled for this time ({currentTimeStr}).
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDoctors.map(doc => {
                    const sched = doc.schedule.find(s => s.day === currentDay);
                    return (
                      <div key={doc.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded transition border border-transparent hover:border-gray-100">
                         <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                           {doc.name.substring(0,2).toUpperCase()}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.specialty}</p>
                         </div>
                         <div className="text-right">
                           <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap">
                             Until {sched?.endTime}
                           </span>
                         </div>
                      </div>
                    );
                  })}
                </div>
              )}
           </div>

           {/* System Health */}
           <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Clinic Status</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-600">Reception</span>
                   <span className="text-green-600 font-medium flex items-center"><CheckCircle size={14} className="mr-1"/> Online</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-600">Reminders Sent</span>
                   <span className="font-bold">{appointments.filter(a => a.reminderSent).length}</span>
                 </div>
              </div>
           </div>
           
           {/* Quick Actions */}
           <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a href="#/appointments" className="block w-full text-center py-2 px-4 bg-primary hover:bg-secondary text-white rounded transition shadow-sm">
                  Add to Queue
                </a>
                <a href="#/patients" className="block w-full text-center py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded transition">
                  Register New Patient
                </a>
              </div>
           </div>

           {/* Next 3 Scheduled (Future) */}
           <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
             <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase text-gray-400">Up Next (Later)</h3>
             {todaysAppointments.filter(a => a.status === AppointmentStatus.Scheduled && a.time > currentTimeStr).slice(0, 3).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No more appointments later today.</p>
             ) : (
                <div className="space-y-3">
                   {todaysAppointments
                      .filter(a => a.status === AppointmentStatus.Scheduled && a.time > currentTimeStr)
                      .slice(0, 3)
                      .map(app => (
                        <div key={app.id} className="flex items-center space-x-3 border-b border-gray-50 pb-2 last:border-0">
                           <div className="bg-gray-100 text-gray-600 font-bold p-2 rounded text-xs">#{app.queueNumber}</div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{patients.find(p => p.id === app.patientId)?.name}</p>
                              <p className="text-xs text-gray-500">{app.time}</p>
                           </div>
                        </div>
                   ))}
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;