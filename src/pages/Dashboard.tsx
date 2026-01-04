import React, { useEffect, useState } from 'react';
import { getAppointments, getDoctors, getPatients, getSettings, saveAppointment } from '../services/db';
import { Appointment, AppointmentStatus, Role } from '../types';
import { DollarSign, Activity, CheckCircle, Clock, Play } from 'lucide-react';
import { formatCurrency, isValidTransition } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const refresh = () => {
    const apps = getAppointments();
    setPatients(getPatients());
    setDoctors(getDoctors());
    setAppointments(user?.role === Role.Doctor ? apps.filter(a => a.doctorId === user.relatedId) : apps);
  };

  useEffect(() => { refresh(); const i = setInterval(refresh, 10000); return () => clearInterval(i); }, [user]);

  const updateStatus = (app: Appointment, s: AppointmentStatus) => {
    saveAppointment({ ...app, status: s });
    refresh();
    showToast(`Status updated to ${s}`, 'success');
  };

  const today = new Date().toISOString().split('T')[0];
  const todays = appointments.filter(a => a.date === today).sort((a,b) => (a.queueNumber || 0) - (b.queueNumber || 0));
  const current = todays.find(a => a.status === AppointmentStatus.InProgress);
  const waiting = todays.filter(a => [AppointmentStatus.CheckedIn, AppointmentStatus.Scheduled].includes(a.status));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-bold">Queue Dashboard</h2>
        <span className="text-gray-500 text-sm font-medium">{new Date().toLocaleDateString('en-GB', { dateStyle: 'full' })}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-sm border-l-8 border-primary">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Currently Serving</h3>
            {current ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-6">
                  <div className="bg-primary text-white text-5xl font-black p-6 rounded-lg shadow-inner">#{current.queueNumber}</div>
                  <div>
                    <h4 className="text-2xl font-bold">{patients.find(p => p.id === current.patientId)?.name}</h4>
                    <p className="text-primary font-medium">{doctors.find(d => d.id === current.doctorId)?.name}</p>
                  </div>
                </div>
                <button onClick={() => updateStatus(current, AppointmentStatus.Completed)} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center hover:bg-green-700 transition">
                  <CheckCircle className="mr-2" size={20}/> Complete
                </button>
              </div>
            ) : (
              <div className="py-10 text-center text-gray-400 italic">No patient in consultation.</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold">Waiting Queue</h3>
              <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">{waiting.length} Waiting</span>
            </div>
            <table className="w-full text-left">
              <thead className="text-xs text-gray-500 uppercase">
                <tr className="border-b"><th className="p-4">Q#</th><th className="p-4">Time</th><th className="p-4">Patient</th><th className="p-4 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y">
                {waiting.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-primary text-lg">#{a.queueNumber}</td>
                    <td className="p-4 text-sm font-mono">{a.time}</td>
                    <td className="p-4 font-medium">{patients.find(p => p.id === a.patientId)?.name}</td>
                    <td className="p-4 text-right">
                      {isValidTransition(a.status, AppointmentStatus.InProgress) && (
                        <button onClick={() => updateStatus(a, AppointmentStatus.InProgress)} className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-secondary">
                          Call In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center"><Clock className="text-blue-600 mr-2" size={18}/><span>Waiting</span></div>
                <span className="font-black text-blue-700">{waiting.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center"><CheckCircle className="text-emerald-600 mr-2" size={18}/><span>Done Today</span></div>
                <span className="font-black text-emerald-700">{todays.filter(a => a.status === AppointmentStatus.Completed).length}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
             <h3 className="font-bold mb-4">Quick Actions</h3>
             <a href="#/appointments" className="block w-full text-center py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition">Book Appointment</a>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;