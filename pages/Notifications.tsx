import React, { useState, useEffect } from 'react';
import { getPatients, getSettings, getNotifications, getDoctors, getAppointments } from '../services/db';
import { Patient, NotificationLog, Doctor } from '../types';
import { sendEmail } from '../services/utils';
import { Send, Clock, Mail } from 'lucide-react';

const Notifications: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [settings] = useState(getSettings());
  
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [subject, setSubject] = useState('Appointment Follow-up');
  const [message, setMessage] = useState('');
  const [templateType, setTemplateType] = useState<'custom' | 'followup'>('custom');

  useEffect(() => {
    setPatients(getPatients());
    setDoctors(getDoctors());
    setLogs(getNotifications());
  }, []);

  const handleTemplateChange = (type: string) => {
    if (type === 'custom') {
      setMessage('');
      setTemplateType('custom');
      return;
    }
    
    // Simple template injection for demo purposes
    if (selectedPatientId) {
      const pat = patients.find(p => p.id === selectedPatientId);
      // Find latest appointment for context or just use generic
      let raw = settings.emailTemplates.followup;
      raw = raw.replace('{patient_name}', pat?.name || 'Patient');
      raw = raw.replace('{doctor_name}', 'your doctor'); // Placeholder
      raw = raw.replace('{clinic_name}', settings.clinicName);
      setMessage(raw);
    }
    setTemplateType('followup');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === selectedPatientId);
    if (!pat) return;

    sendEmail(pat.email, subject, message, 'Manual');
    setLogs(getNotifications());
    alert('Notification queued successfully!');
    setMessage('');
    setTemplateType('custom');
  };

  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Notification Center</h2>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Send size={20} className="mr-2 text-primary" /> Send New Message
          </h3>
          <form onSubmit={handleSend} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Recipient (Patient)</label>
               <select 
                 required 
                 className={inputClass} 
                 value={selectedPatientId} 
                 onChange={e => { setSelectedPatientId(e.target.value); if(templateType !== 'custom') handleTemplateChange(templateType); }}
               >
                 <option value="">Select Patient...</option>
                 {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
               </select>
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Use Template</label>
               <div className="flex space-x-4">
                 <label className="flex items-center">
                   <input type="radio" name="temp" checked={templateType === 'custom'} onChange={() => handleTemplateChange('custom')} className="mr-2"/>
                   Custom Message
                 </label>
                 <label className="flex items-center">
                   <input type="radio" name="temp" checked={templateType === 'followup'} onChange={() => handleTemplateChange('followup')} className="mr-2"/>
                   Post-Visit Follow-up
                 </label>
               </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
               <input 
                required 
                className={inputClass} 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
               <textarea 
                required 
                className={`${inputClass} font-mono text-sm`} 
                rows={6} 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
               />
               <p className="text-xs text-gray-400 mt-1">Emails are simulated and logged to the system.</p>
             </div>

             <div className="flex justify-end">
               <button type="submit" className="bg-primary text-white px-6 py-2 rounded hover:bg-secondary flex items-center">
                 <Send size={16} className="mr-2" /> Send Notification
               </button>
             </div>
          </form>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Notification Log</h3>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="p-4 text-gray-500 text-center">No notifications sent yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map(log => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${log.type === 'Auto' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {log.type}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center">
                      <Clock size={10} className="mr-1" />
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-800 truncate">{log.subject}</h4>
                  <p className="text-xs text-gray-500 mb-1">To: {log.recipientEmail}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;