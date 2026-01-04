import React, { useState, useEffect, useRef } from 'react';
import { Appointment, AppointmentStatus, AppointmentType, Doctor, Patient, Role, PaymentStatus } from '../types';
import { getAppointments, saveAppointment, getDoctors, getPatients, getNextQueueNumber } from '../services/db';
import { generateId, formatCurrency, getValidTransitions } from '../services/utils';
import { Plus, Calendar, Clock, X, Filter, Hash, AlertCircle, Loader, ShieldAlert } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overrideSchedule, setOverrideSchedule] = useState(false);
  
  // Filters
  const [filterDoc, setFilterDoc] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // New Appointment State
  const [newApp, setNewApp] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    status: AppointmentStatus.Scheduled,
    paymentStatus: PaymentStatus.Pending,
    type: AppointmentType.Consultation,
    amountPaid: 0,
    totalFee: 0
  });

  // Time Slot State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotStatus, setSlotStatus] = useState<string>('');

  useEffect(() => {
    isMounted.current = true;
    refreshData();
    return () => { isMounted.current = false; };
  }, []);

  // Update slots when Date, Doctor, or Override changes
  useEffect(() => {
    if (!isModalOpen) return;
    
    // Reset slots initially
    setAvailableSlots([]);
    setSlotStatus('');

    if (!newApp.date || !newApp.doctorId) {
      setSlotStatus('Please select a doctor and date first.');
      return;
    }

    const doctor = doctors.find(d => d.id === newApp.doctorId);
    if (!doctor) return;

    // Set Default Fee if not set yet or if changing doctor
    if (!newApp.id) {
        setNewApp(prev => ({ ...prev, totalFee: doctor.consultationFee }));
    }

    // 1. Get Day of Week
    const dayOfWeek = format(parseISO(newApp.date), 'EEE');

    // 2. Determine Time Range (Standard vs Override)
    let startH = 0, startM = 0, endH = 0, endM = 0;
    
    if (overrideSchedule) {
      // Emergency Mode: 24-hour availability
      startH = 0; startM = 0;
      endH = 24; endM = 0;
    } else {
      // Standard Mode: Use Doctor's Schedule
      const schedule = doctor.schedule.find(s => s.day === dayOfWeek);

      if (!schedule || !schedule.isWorking) {
        setSlotStatus(`Dr. ${doctor.name} is not available on ${dayOfWeek}s.`);
        return;
      }
      
      [startH, startM] = schedule.startTime.split(':').map(Number);
      [endH, endM] = schedule.endTime.split(':').map(Number);
    }

    // 3. Generate 30-min Slots
    const slots: string[] = [];
    
    let currentMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    while (currentMins < endMins) {
      const h = Math.floor(currentMins / 60);
      const m = currentMins % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      // 4. Check Collision
      const isTaken = appointments.some(a => 
        a.doctorId === newApp.doctorId && 
        a.date === newApp.date && 
        a.time === timeStr && 
        a.status !== AppointmentStatus.Cancelled &&
        a.id !== newApp.id
      );

      if (!isTaken) {
        slots.push(timeStr);
      }
      
      currentMins += 30; // 30 Minute Interval
    }

    setAvailableSlots(slots);
    
    if (slots.length === 0) {
      setSlotStatus('No available slots for this date.');
    }

    // Clear selected time if it's no longer valid
    if (newApp.time && !slots.includes(newApp.time)) {
      setNewApp(prev => ({ ...prev, time: '' }));
    }

  }, [newApp.date, newApp.doctorId, isModalOpen, doctors, appointments, overrideSchedule]);

  const refreshData = () => {
    setLoading(true);
    // Simulate slight network delay for better UX feel
    setTimeout(() => {
        if (!isMounted.current) return;
        
        const allApps = getAppointments();
        const allDocs = getDoctors();
        const allPats = getPatients();

        setDoctors(allDocs);
        setPatients(allPats);

        // Filter appointments if user is a Doctor
        if (user?.role === Role.Doctor && user.relatedId) {
            setAppointments(allApps.filter(a => a.doctorId === user.relatedId));
            setNewApp(prev => ({ ...prev, doctorId: user.relatedId }));
        } else {
            setAppointments(allApps);
        }
        setLoading(false);
    }, 300);
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
      showToast('Slot unavailable. Please refresh.', 'error');
      return;
    }

    // Payment Logic Verification
    const total = Number(newApp.totalFee) || 0;
    const paid = Number(newApp.amountPaid) || 0;
    let payStatus = PaymentStatus.Pending;
    
    if (paid >= total && total > 0) payStatus = PaymentStatus.Paid;
    else if (paid > 0) payStatus = PaymentStatus.Partial;
    else payStatus = PaymentStatus.Pending;

    if (payStatus === PaymentStatus.Partial && !newApp.paymentNote) {
        showToast('Please provide a reason for partial payment.', 'error');
        return;
    }

    // Auto-Assign Queue Number if new
    let queueNumber = newApp.queueNumber;
    if (!newApp.id && !queueNumber) {
      queueNumber = getNextQueueNumber(newApp.date);
    }

    const appToSave: Appointment = {
      id: newApp.id || generateId(),
      doctorId: newApp.doctorId,
      patientId: newApp.patientId,
      date: newApp.date,
      time: newApp.time,
      status: newApp.status || AppointmentStatus.Scheduled,
      type: newApp.type || AppointmentType.Consultation,
      totalFee: total,
      amountPaid: paid,
      paymentStatus: payStatus,
      paymentNote: newApp.paymentNote,
      notes: newApp.notes,
      reminderSent: newApp.reminderSent || false,
      queueNumber: queueNumber
    };

    saveAppointment(appToSave);
    refreshData();
    setIsModalOpen(false);
    showToast('Appointment saved successfully', 'success');
    
    // Reset Form
    setNewApp({ 
      date: new Date().toISOString().split('T')[0], 
      status: AppointmentStatus.Scheduled, 
      paymentStatus: PaymentStatus.Pending,
      type: AppointmentType.Consultation,
      amountPaid: 0,
      totalFee: 0,
      doctorId: user?.role === Role.Doctor ? user.relatedId : undefined
    });
  };

  const handleStatusChange = (app: Appointment, status: AppointmentStatus) => {
    saveAppointment({ ...app, status });
    refreshData();
    showToast(`Status updated to ${status}`, 'info');
  };

  const editAppointment = (app: Appointment) => {
      setNewApp(app);
      setOverrideSchedule(false); // Reset override on open
      setIsModalOpen(true);
  };

  const filteredApps = appointments.filter(a => {
    if (filterDoc && a.doctorId !== filterDoc) return false;
    if (filterDate && a.date !== filterDate) return false;
    return true;
  }).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  if (loading) {
      return <div className="h-full flex items-center justify-center text-primary"><Loader className="animate-spin mr-2" /> Loading Appointments...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Appointment Scheduler</h2>
        <button 
          onClick={() => {
              setNewApp({ 
                date: new Date().toISOString().split('T')[0], 
                status: AppointmentStatus.Scheduled, 
                paymentStatus: PaymentStatus.Pending,
                type: AppointmentType.Consultation,
                amountPaid: 0,
                totalFee: 0,
                doctorId: user?.role === Role.Doctor ? user.relatedId : undefined
              });
              setOverrideSchedule(false);
              setIsModalOpen(true);
          }}
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
            <thead className="bg-gray-50 text-gray-500 text-sm font-medium sticky top-0 z-10">
              <tr>
                <th className="p-4 w-20 text-center">#</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Doctor</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Type / Status</th>
                <th className="p-4 text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApps.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No appointments found.</td></tr>
              ) : filteredApps.map(app => {
                const doc = doctors.find(d => d.id === app.doctorId);
                const pat = patients.find(p => p.id === app.patientId);
                const allowedTransitions = getValidTransitions(app.status);
                
                return (
                  <tr key={app.id} className="hover:bg-gray-50 group">
                    <td className="p-4 text-center cursor-pointer" onClick={() => editAppointment(app)}>
                       {app.queueNumber ? (
                         <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">{app.queueNumber}</span>
                       ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => editAppointment(app)}>
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
                      <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">{app.type}</div>
                      
                      {/* Robust Status Dropdown */}
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                            app.status === AppointmentStatus.Scheduled ? 'bg-blue-500' :
                            app.status === AppointmentStatus.CheckedIn ? 'bg-amber-500' :
                            app.status === AppointmentStatus.InProgress ? 'bg-purple-500' :
                            app.status === AppointmentStatus.Completed ? 'bg-green-500' :
                            'bg-red-500'
                        }`}></div>
                        <select 
                          value={app.status}
                          onChange={(e) => handleStatusChange(app, e.target.value as AppointmentStatus)}
                          className={`text-xs rounded p-1 border font-medium focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer
                             ${app.status === AppointmentStatus.Completed ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-800'}
                          `}
                        >
                          <option value={app.status}>{app.status}</option>
                          {allowedTransitions.map(s => (
                            <option key={s} value={s}>
                              → {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex flex-col items-end cursor-pointer" onClick={() => editAppointment(app)}>
                         <span className="font-mono text-sm font-bold text-gray-800">{formatCurrency(app.totalFee)}</span>
                         <span className={`text-xs px-2 py-0.5 rounded border mt-1 ${
                            app.paymentStatus === PaymentStatus.Paid ? 'bg-green-50 text-green-700 border-green-200' : 
                            app.paymentStatus === PaymentStatus.Partial ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-red-50 text-red-700 border-red-200'
                         }`}>
                           {app.paymentStatus.toUpperCase()}
                         </span>
                         {app.paymentStatus === PaymentStatus.Partial && (
                             <span className="text-[10px] text-gray-400 mt-1">Paid: {formatCurrency(app.amountPaid)}</span>
                         )}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">{newApp.id ? 'Edit Appointment' : 'New Appointment'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              {/* Info Banner */}
              <div className="flex space-x-4">
                <div className="flex-1 bg-blue-50 p-3 rounded text-sm text-blue-800 flex items-center">
                  <Hash size={16} className="mr-2" />
                  Queue number: <span className="font-bold ml-1">{newApp.queueNumber || 'Auto-assigned'}</span>
                </div>
                {/* Emergency Override Toggle */}
                <div className={`flex items-center p-3 rounded border cursor-pointer select-none transition-colors ${overrideSchedule ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`} onClick={() => setOverrideSchedule(!overrideSchedule)}>
                   <input type="checkbox" checked={overrideSchedule} onChange={() => {}} className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" />
                   <span className={`text-sm font-medium ${overrideSchedule ? 'text-red-700' : 'text-gray-600'}`}>Emergency / Override Schedule</span>
                </div>
              </div>

              {/* 1. People & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium mb-1 text-gray-700">Doctor</label>
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
                   <label className="block text-sm font-medium mb-1 text-gray-700">Patient</label>
                   <select required className={inputClass} value={newApp.patientId || ''} onChange={e => setNewApp({...newApp, patientId: e.target.value})}>
                     <option value="">Select Patient...</option>
                     {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
              </div>

              {/* 2. Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium mb-1 text-gray-700">Date</label>
                   <input required type="date" className={inputClass} value={newApp.date || ''} onChange={e => setNewApp({...newApp, date: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1 text-gray-700 flex justify-between">
                     Time Slot
                     {overrideSchedule && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">EMERGENCY MODE</span>}
                   </label>
                   {availableSlots.length > 0 || newApp.id ? (
                      <select required className={inputClass} value={newApp.time || ''} onChange={e => setNewApp({...newApp, time: e.target.value})}>
                        <option value="">Select Time...</option>
                        {availableSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        {/* Ensure current time is visible if editing even if slots recalc */}
                        {newApp.id && newApp.time && !availableSlots.includes(newApp.time) && <option value={newApp.time}>{newApp.time}</option>}
                      </select>
                   ) : (
                      <div className={`text-sm p-2 rounded border flex items-center ${overrideSchedule ? 'bg-white border-gray-300' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {!overrideSchedule && <AlertCircle size={16} className="mr-2 flex-shrink-0" />}
                        <span>{slotStatus || 'Select Doctor & Date'}</span>
                      </div>
                   )}
                </div>
              </div>

              <div className="border-t pt-4"></div>

              {/* 3. Type & Fees */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Appointment Type</label>
                    <select 
                        className={inputClass} 
                        value={newApp.type} 
                        onChange={e => setNewApp({...newApp, type: e.target.value as AppointmentType})}
                    >
                        <option value={AppointmentType.FirstVisit}>First Visit</option>
                        <option value={AppointmentType.Consultation}>Consultation</option>
                        <option value={AppointmentType.FollowUp}>Follow-up</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Consultation Fee</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">EGP</span>
                        <input 
                            type="number" 
                            className={`${inputClass} pl-12`} 
                            value={newApp.totalFee} 
                            onChange={e => setNewApp({...newApp, totalFee: Number(e.target.value)})} 
                        />
                    </div>
                </div>
              </div>

              {/* 4. Payment */}
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">Payment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700">Amount Paid</label>
                          <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">EGP</span>
                                <input 
                                    type="number" 
                                    className={`${inputClass} pl-12`} 
                                    value={newApp.amountPaid} 
                                    onChange={e => setNewApp({...newApp, amountPaid: Number(e.target.value)})} 
                                />
                          </div>
                      </div>
                      <div className="flex items-center">
                         <div className={`w-full p-2 rounded text-center text-sm font-bold border ${
                            (newApp.amountPaid || 0) >= (newApp.totalFee || 0) && (newApp.totalFee || 0) > 0 ? 'bg-green-100 text-green-700 border-green-300' :
                            (newApp.amountPaid || 0) > 0 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                            'bg-gray-100 text-gray-500 border-gray-300'
                         }`}>
                             {(newApp.amountPaid || 0) >= (newApp.totalFee || 0) && (newApp.totalFee || 0) > 0 ? 'FULLY PAID' :
                              (newApp.amountPaid || 0) > 0 ? `PARTIAL (Due: ${formatCurrency((newApp.totalFee || 0) - (newApp.amountPaid || 0))})` :
                              'PAYMENT PENDING'}
                         </div>
                      </div>
                  </div>
                  
                  {/* Partial Payment Reason */}
                  {(newApp.amountPaid || 0) > 0 && (newApp.amountPaid || 0) < (newApp.totalFee || 0) && (
                      <div className="mt-3 animate-fade-in-up">
                          <label className="block text-sm font-medium mb-1 text-red-600">Reason for Partial Payment (Required)</label>
                          <input 
                            required
                            type="text" 
                            placeholder="e.g. Insurance pending, patient didn't have cash..." 
                            className={inputClass}
                            value={newApp.paymentNote || ''}
                            onChange={e => setNewApp({...newApp, paymentNote: e.target.value})}
                          />
                      </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Clinical Notes (Optional)</label>
                <textarea className={inputClass} rows={2} value={newApp.notes || ''} onChange={e => setNewApp({...newApp, notes: e.target.value})} />
              </div>

              <div className="flex justify-end pt-4 space-x-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary">Save Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;