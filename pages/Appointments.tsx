import React, { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus, Doctor, Patient, Role } from '../types';
import { getAppointments, saveAppointment, getDoctors, getPatients } from '../services/db';
import { generateId, formatCurrency } from '../services/utils';
import { Plus, Calendar, Clock, X, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [filterDoc, setFilterDoc] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // New Appointment State
  const [newApp, setNewApp] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    status: AppointmentStatus.Scheduled,
    isPaid: false
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const allApps = getAppointments();
    const allDocs = getDoctors();
    const allPats = getPatients();

    setDoctors(allDocs);
    setPatients(allPats);

    // Filter appointments if user is a Doctor
    if (user?.role === Role.Doctor && user.relatedId) {
      setAppointments(allApps.filter(a => a.doctorId === user.relatedId));
      // Auto-set doctor filter for new appointments
      setNewApp(prev => ({ ...prev, doctorId: user.relatedId }));
    } else {
      setAppointments(allApps);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.doctorId || !newApp.patientId || !newApp.date || !newApp.time) return;

    // Double booking check
    const collision = appointments.find(a => 
      a.doctorId === newApp.doctorId && 
      a.date === newApp.date && 
      a.time === newApp.time &&
      a.status !== AppointmentStatus.Cancelled &&
      a.id !== newApp.id
    );

    if (collision) {
      alert('This doctor is already booked at this time!');
      return;
    }

    const doc = doctors.find(d => d.id === newApp.doctorId);

    const appToSave: Appointment = {
      id: newApp.id || generateId(),
      doctorId: newApp.doctorId,
      patientId: newApp.patientId,
      date: newApp.date,
      time: newApp.time,
      status: newApp.status || AppointmentStatus.Scheduled,
      isPaid: newApp.isPaid || false,
      feeSnapshot: doc ? doc.consultationFee : 0,
      notes: newApp.notes,
      reminderSent: false
    };

    saveAppointment(appToSave);
    refreshData();
    setIsModalOpen(false);
    setNewApp({ 
      date: new Date().toISOString().split('T')[0], 
      status: AppointmentStatus.Scheduled, 
      isPaid: false,
      doctorId: user?.role === Role.Doctor ? user.relatedId : undefined
    });
  };

  const handleStatusChange = (app: Appointment, status: AppointmentStatus) => {
    saveAppointment({ ...app, status });
    refreshData();
  };

  const togglePaid = (app: Appointment) => {
    // Doctors might not be allowed to mark payments in some clinics, but allowing for now.
    saveAppointment({ ...app, isPaid: !app.isPaid });
    refreshData();
  };

  // Filter Logic
  const filteredApps = appointments.filter(a => {
    if (filterDoc && a.doctorId !== filterDoc) return false;
    if (filterDate && a.date !== filterDate) return false;
    return true;
  }).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Appointment Scheduler</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-secondary shadow-sm"
        >
          <Plus size={18} />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex space-x-4">
        {user?.role !== Role.Doctor && (
          <div className="flex items-center space-x-2 flex-1">
            <Filter size={18} className="text-gray-400" />
            <select 
              className="bg-white text-gray-900 border border-gray-300 rounded p-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Calendar size={18} className="text-gray-400" />
          <input 
            type="date" 
            className="bg-white text-gray-900 border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
          {filterDate && <button onClick={() => setFilterDate('')} className="text-xs text-red-500">Clear</button>}
        </div>
      </div>

      {/* Appointment List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm font-medium sticky top-0">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Doctor</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Fee / Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApps.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No appointments found.</td></tr>
              ) : filteredApps.map(app => {
                const doc = doctors.find(d => d.id === app.doctorId);
                const pat = patients.find(p => p.id === app.patientId);
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{format(parseISO(app.date), 'MMM dd, yyyy')}</div>
                      <div className="text-sm text-gray-500 flex items-center space-x-1">
                        <Clock size={12} /> <span>{app.time}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{doc?.name || 'Unknown'}</div>
                      <div className="text-xs text-teal-600">{doc?.specialty}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{pat?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{pat?.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-mono text-sm">{formatCurrency(app.feeSnapshot)}</span>
                        {/* Only Admin/Receptionist handle payment status usually, but keeping open for demo */}
                        <button 
                          onClick={() => togglePaid(app)} 
                          className={`text-xs px-2 py-0.5 rounded border ${app.isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                        >
                          {app.isPaid ? 'PAID' : 'PENDING'}
                        </button>
                      </div>
                      <select 
                        value={app.status}
                        onChange={(e) => handleStatusChange(app, e.target.value as AppointmentStatus)}
                        className={`text-xs rounded p-1 border ${
                          app.status === AppointmentStatus.Scheduled ? 'text-blue-600 border-blue-200 bg-blue-50' :
                          app.status === AppointmentStatus.Completed ? 'text-green-600 border-green-200 bg-green-50' :
                          'text-red-600 border-red-200 bg-red-50'
                        }`}
                      >
                        {Object.values(AppointmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4 text-right">
                       {app.status === AppointmentStatus.Scheduled && (
                         <button onClick={() => handleStatusChange(app, AppointmentStatus.Cancelled)} className="text-red-400 hover:text-red-600 text-xs underline">Cancel</button>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">New Appointment</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium mb-1">Doctor</label>
                   {user?.role === Role.Doctor ? (
                     <input 
                       disabled 
                       value={doctors.find(d => d.id === user.relatedId)?.name || ''} 
                       className="w-full border p-2 rounded bg-gray-100 text-gray-700"
                     />
                   ) : (
                    <select required className={inputClass} value={newApp.doctorId || ''} onChange={e => setNewApp({...newApp, doctorId: e.target.value})}>
                      <option value="">Select Doctor...</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.name} - {d.specialty}</option>)}
                    </select>
                   )}
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Patient</label>
                   <select required className={inputClass} value={newApp.patientId || ''} onChange={e => setNewApp({...newApp, patientId: e.target.value})}>
                     <option value="">Select Patient...</option>
                     {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium mb-1">Date</label>
                   <input required type="date" className={inputClass} value={newApp.date || ''} onChange={e => setNewApp({...newApp, date: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Time</label>
                   <input required type="time" className={inputClass} value={newApp.time || ''} onChange={e => setNewApp({...newApp, time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea className={inputClass} rows={2} value={newApp.notes || ''} onChange={e => setNewApp({...newApp, notes: e.target.value})} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                 <input type="checkbox" id="paid" checked={newApp.isPaid} onChange={e => setNewApp({...newApp, isPaid: e.target.checked})} />
                 <label htmlFor="paid" className="text-sm text-gray-700">Payment Collected</label>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary">Create Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;