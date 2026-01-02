import React, { useEffect, useState } from 'react';
import { getAppointments, getDoctors, getPatients, getSettings, saveAppointment } from '../services/db';
import { Appointment, AppointmentStatus, Role } from '../types';
import { Users, Calendar, DollarSign, Activity, CheckCircle, Clock } from 'lucide-react';
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

  useEffect(() => {
    const allApps = getAppointments();
    const doctors = getDoctors();
    const patients = getPatients();
    const settings = getSettings();
    
    // 1. Run Auto-Reminder Logic
    if (settings.enableAutoReminders) {
      const tomorrow = addDays(new Date(), 1);
      
      allApps.forEach(app => {
        if (
          !app.reminderSent && 
          app.status === AppointmentStatus.Scheduled &&
          isSameDay(parseISO(app.date), tomorrow)
        ) {
          const pat = patients.find(p => p.id === app.patientId);
          const doc = doctors.find(d => d.id === app.doctorId);
          
          if (pat && doc && pat.email) {
            let body = settings.emailTemplates.reminder;
            body = body.replace('{patient_name}', pat.name)
                       .replace('{doctor_name}', doc.name)
                       .replace('{date}', app.date)
                       .replace('{time}', app.time)
                       .replace('{clinic_name}', settings.clinicName);
            
            sendEmail(pat.email, `Appointment Reminder: ${app.date}`, body, 'Auto');
            
            // Update appointment so we don't send twice
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
    setPatientCount(patients.length);
    setDoctorCount(doctors.length);

    const todayStr = new Date().toISOString().split('T')[0];
    const revenue = visibleApps
      .filter(a => a.date === todayStr && a.isPaid)
      .reduce((sum, a) => sum + (a.feeSnapshot || 0), 0);
    setTodayRevenue(revenue);
  }, [user]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter(a => a.date === todayStr).sort((a,b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        Welcome back, {user?.name} 
        <span className="text-sm font-normal text-gray-500 ml-2">({user?.role})</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Patients" 
          value={patientCount} 
          icon={<Users size={24} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Doctors" 
          value={doctorCount} 
          icon={<Activity size={24} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="My Schedule Today" 
          value={todaysAppointments.length} 
          icon={<Calendar size={24} />} 
          color="bg-purple-500" 
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
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Schedule</h3>
          {todaysAppointments.length === 0 ? (
            <p className="text-gray-500 italic">No appointments scheduled for today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-sm text-gray-500 border-b border-gray-100">
                    <th className="py-2">Time</th>
                    <th className="py-2">Patient</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {todaysAppointments.map(app => (
                    <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-mono text-gray-600">{app.time}</td>
                      <td className="py-3 font-medium text-gray-800">{getPatients().find(p => p.id === app.patientId)?.name || 'Unknown'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          app.status === AppointmentStatus.Completed ? 'bg-green-100 text-green-700' :
                          app.status === AppointmentStatus.Cancelled ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a href="#/appointments" className="block w-full text-center py-2 px-4 bg-primary hover:bg-secondary text-white rounded transition shadow-sm">
              New Appointment
            </a>
            <a href="#/patients" className="block w-full text-center py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded transition">
              Register Patient
            </a>
            <div className="pt-4 border-t border-gray-100">
               <h4 className="text-sm font-medium text-gray-600 mb-2">System Status</h4>
               <div className="flex items-center space-x-2 text-sm text-green-600">
                 <CheckCircle size={16} />
                 <span>Database Connected</span>
               </div>
               <div className="flex items-center space-x-2 text-sm text-green-600 mt-1">
                 <Clock size={16} />
                 <span>Auto-Reminders Active</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;