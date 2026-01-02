import React, { useState, useEffect } from 'react';
import { Doctor } from '../types';
import { getDoctors, saveDoctor, deleteDoctor } from '../services/db';
import { generateId, formatCurrency } from '../services/utils';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const Doctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState<Partial<Doctor>>({});

  useEffect(() => {
    setDoctors(getDoctors());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDoctor.name || !currentDoctor.specialty) return;

    const docToSave: Doctor = {
      id: currentDoctor.id || generateId(),
      name: currentDoctor.name!,
      specialty: currentDoctor.specialty!,
      email: currentDoctor.email || '',
      phone: currentDoctor.phone || '',
      consultationFee: Number(currentDoctor.consultationFee) || 0,
      availableDays: currentDoctor.availableDays || [],
      startHour: currentDoctor.startHour || '09:00',
      endHour: currentDoctor.endHour || '17:00',
      bio: currentDoctor.bio || ''
    };

    saveDoctor(docToSave);
    setDoctors(getDoctors());
    setIsModalOpen(false);
    setCurrentDoctor({});
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this doctor?')) {
      deleteDoctor(id);
      setDoctors(getDoctors());
    }
  };

  const handleEdit = (doc: Doctor) => {
    setCurrentDoctor({ ...doc });
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    const days = currentDoctor.availableDays || [];
    if (days.includes(day)) {
      setCurrentDoctor({ ...currentDoctor, availableDays: days.filter(d => d !== day) });
    } else {
      setCurrentDoctor({ ...currentDoctor, availableDays: [...days, day] });
    }
  };

  // Common input classes for consistent light theme
  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Doctor Management</h2>
        <button 
          onClick={() => { setCurrentDoctor({}); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-secondary"
        >
          <Plus size={18} />
          <span>Add Doctor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map(doc => (
          <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                   <h3 className="text-lg font-bold text-gray-800">{doc.name}</h3>
                   <span className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded mt-1">{doc.specialty}</span>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(doc)} className="text-gray-400 hover:text-blue-500"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 space-y-2">
                <p><strong>Fee:</strong> {formatCurrency(doc.consultationFee)}</p>
                <p><strong>Phone:</strong> {doc.phone}</p>
                <p><strong>Schedule:</strong> {doc.availableDays.join(', ')}</p>
                <p><strong>Hours:</strong> {doc.startHour} - {doc.endHour}</p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
               <p className="text-xs text-gray-500 truncate">{doc.email}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">{currentDoctor.id ? 'Edit Doctor' : 'New Doctor'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input required type="text" className={inputClass} value={currentDoctor.name || ''} onChange={e => setCurrentDoctor({...currentDoctor, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialty</label>
                  <select required className={inputClass} value={currentDoctor.specialty || ''} onChange={e => setCurrentDoctor({...currentDoctor, specialty: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General">General Practice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Consultation Fee</label>
                  <input required type="number" className={inputClass} value={currentDoctor.consultationFee || ''} onChange={e => setCurrentDoctor({...currentDoctor, consultationFee: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input type="text" className={inputClass} value={currentDoctor.phone || ''} onChange={e => setCurrentDoctor({...currentDoctor, phone: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" className={inputClass} value={currentDoctor.email || ''} onChange={e => setCurrentDoctor({...currentDoctor, email: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Days</label>
                <div className="flex space-x-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1 text-sm rounded border ${
                        (currentDoctor.availableDays || []).includes(day)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Hour</label>
                  <input type="time" className={inputClass} value={currentDoctor.startHour || '09:00'} onChange={e => setCurrentDoctor({...currentDoctor, startHour: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Hour</label>
                  <input type="time" className={inputClass} value={currentDoctor.endHour || '17:00'} onChange={e => setCurrentDoctor({...currentDoctor, endHour: e.target.value})} />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <textarea className={inputClass} rows={3} value={currentDoctor.bio || ''} onChange={e => setCurrentDoctor({...currentDoctor, bio: e.target.value})} />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;