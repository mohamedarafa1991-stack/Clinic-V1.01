import React, { useState, useEffect } from 'react';
import { Doctor, DaySchedule } from '../types';
import { getDoctors, saveDoctor, deleteDoctor, getSettings } from '../services/db';
import { generateId, formatCurrency, fileToBase64 } from '../services/utils';
import { getFileFromDisk } from '../services/storage';
import { Plus, Trash2, Edit2, X, Upload, FileText, Image as ImageIcon, Download, Copy, Clock, Paperclip } from 'lucide-react';

const Doctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState<Partial<Doctor>>({});
  const settings = getSettings();
  const specialties = settings.specialties || [];

  useEffect(() => {
    setDoctors(getDoctors());
  }, []);

  const createDefaultSchedule = (): DaySchedule[] => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(d => ({
      day: d,
      startTime: '09:00',
      endTime: '17:00',
      isWorking: d !== 'Sat' && d !== 'Sun'
    }));
  };

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
      schedule: currentDoctor.schedule || createDefaultSchedule(),
      bio: currentDoctor.bio || '',
      photo: currentDoctor.photo,
      documents: currentDoctor.documents || []
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
    const schedule = doc.schedule && doc.schedule.length > 0 ? doc.schedule : createDefaultSchedule();
    setCurrentDoctor({ ...doc, schedule });
    setIsModalOpen(true);
  };

  const handleScheduleChange = (index: number, field: keyof DaySchedule, value: any) => {
    const newSchedule = [...(currentDoctor.schedule || createDefaultSchedule())];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setCurrentDoctor({ ...currentDoctor, schedule: newSchedule });
  };

  const copyMonToWeekdays = () => {
    const currentSchedule = currentDoctor.schedule || createDefaultSchedule();
    const mon = currentSchedule.find(d => d.day === 'Mon');
    if (!mon) return;

    const newSchedule = currentSchedule.map(d => {
      if (['Tue', 'Wed', 'Thu', 'Fri'].includes(d.day)) {
        return { ...d, startTime: mon.startTime, endTime: mon.endTime, isWorking: mon.isWorking };
      }
      return d;
    });
    setCurrentDoctor({ ...currentDoctor, schedule: newSchedule });
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, diff / 60).toFixed(1);
  };

  const getBarStyles = (start: string, end: string) => {
    if (!start || !end) return { left: '0%', width: '0%' };
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const viewStart = 6 * 60; 
    const range = 16 * 60;
    let left = ((startMins - viewStart) / range) * 100;
    let width = ((endMins - startMins) / range) * 100;
    if (left < 0) { width += left; left = 0; }
    if (width < 0) width = 0;
    if (left + width > 100) width = 100 - left;
    return { left: `${left}%`, width: `${width}%` };
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const path = await fileToBase64(e.target.files[0]);
        setCurrentDoctor({ ...currentDoctor, photo: path });
      } catch (err) {
        alert("Image upload failed. Disk full?");
      }
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const path = await fileToBase64(file);
        const type = file.type.includes('image') ? 'image' : 'pdf';
        const newDoc = { name: file.name, type: type as 'image'|'pdf', data: path };
        setCurrentDoctor({
          ...currentDoctor,
          documents: [...(currentDoctor.documents || []), newDoc]
        });
      } catch (err) {
        alert("Document upload failed.");
      }
    }
  };

  const removeDoc = (index: number) => {
    const docs = [...(currentDoctor.documents || [])];
    docs.splice(index, 1);
    setCurrentDoctor({ ...currentDoctor, documents: docs });
  };

  const inputClass = "w-full bg-white text-gray-900 border border-gray-200 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-shadow";

  return (
    <div className="animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Doctor Management</h2>
        <button 
          onClick={() => { setCurrentDoctor({ schedule: createDefaultSchedule() }); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-secondary transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Add Doctor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map(doc => {
          const photoUrl = getFileFromDisk(doc.photo);
          return (
            <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon size={24} />
                        </div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 truncate">{doc.name}</h3>
                      <span className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded-md font-medium mt-1">{doc.specialty}</span>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(doc)} className="text-gray-400 hover:text-blue-500 p-1.5 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                    <span className="text-gray-400">Consultation</span>
                    <span className="font-bold text-gray-800">{formatCurrency(doc.consultationFee)}</span>
                  </div>
                  <p className="flex items-center text-gray-500 pt-1">
                     <Paperclip size={14} className="mr-2"/> 
                     {doc.documents?.length || 0} Documents
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-gray-800 tracking-tight">{currentDoctor.id ? 'Edit Doctor Profile' : 'New Doctor Registration'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-8">
              
              {/* Photo & Basic Info */}
              <div className="flex flex-col md:flex-row gap-8">
                 <div className="flex flex-col items-center space-y-3">
                   <div className="w-32 h-32 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary transition cursor-pointer relative group">
                     {currentDoctor.photo ? (
                       <img src={getFileFromDisk(currentDoctor.photo)} className="w-full h-full object-cover" />
                     ) : (
                       <div className="text-center text-gray-400">
                         <ImageIcon size={32} className="mx-auto mb-1 opacity-50"/>
                         <span className="text-[10px] uppercase font-bold">No Photo</span>
                       </div>
                     )}
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePhotoUpload} />
                     <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white font-bold text-xs">Change</div>
                   </div>
                 </div>

                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                      <input required type="text" className={inputClass} value={currentDoctor.name || ''} onChange={e => setCurrentDoctor({...currentDoctor, name: e.target.value})} placeholder="Dr. John Doe" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Specialty</label>
                      <select required className={inputClass} value={currentDoctor.specialty || ''} onChange={e => setCurrentDoctor({...currentDoctor, specialty: e.target.value})}>
                        <option value="">Select Specialty...</option>
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Consultation Fee</label>
                      <input required type="number" className={inputClass} value={currentDoctor.consultationFee || ''} onChange={e => setCurrentDoctor({...currentDoctor, consultationFee: Number(e.target.value)})} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                      <input type="text" className={inputClass} value={currentDoctor.phone || ''} onChange={e => setCurrentDoctor({...currentDoctor, phone: e.target.value})} placeholder="+20..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                      <input type="email" className={inputClass} value={currentDoctor.email || ''} onChange={e => setCurrentDoctor({...currentDoctor, email: e.target.value})} placeholder="doctor@clinic.com" />
                    </div>
                 </div>
              </div>
              
              {/* Schedule */}
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-black text-gray-800 uppercase tracking-wide flex items-center"><Clock size={16} className="mr-2"/> Work Schedule</label>
                  <button type="button" onClick={copyMonToWeekdays} className="text-xs flex items-center text-primary bg-white border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition font-bold shadow-sm">
                     <Copy size={12} className="mr-1" />
                     Copy Mon to Weekdays
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(currentDoctor.schedule || createDefaultSchedule()).map((day, idx) => (
                    <div key={day.day} className="flex items-center bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md">
                      <label className="flex items-center w-24 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={day.isWorking}
                          onChange={e => handleScheduleChange(idx, 'isWorking', e.target.checked)}
                          className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary mr-3"
                        />
                        <span className={`font-bold text-sm ${day.isWorking ? 'text-gray-800' : 'text-gray-400'}`}>{day.day}</span>
                      </label>
                      <div className={`flex-1 flex items-center ${day.isWorking ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                         <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                           <input
                             type="time"
                             value={day.startTime}
                             onChange={e => handleScheduleChange(idx, 'startTime', e.target.value)}
                             className="bg-transparent text-xs font-mono focus:outline-none w-20 text-center font-bold text-gray-600"
                           />
                           <span className="text-gray-300 text-[10px] uppercase font-bold">to</span>
                           <input
                             type="time"
                             value={day.endTime}
                             onChange={e => handleScheduleChange(idx, 'endTime', e.target.value)}
                             className="bg-transparent text-xs font-mono focus:outline-none w-20 text-center font-bold text-gray-600"
                           />
                         </div>
                         <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full relative overflow-hidden hidden sm:block">
                            <div className="absolute top-0 bottom-0 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full opacity-80" style={getBarStyles(day.startTime, day.endTime)}></div>
                         </div>
                         <div className="w-12 text-right text-[10px] text-gray-400 font-bold">
                           {day.isWorking ? `${calculateDuration(day.startTime, day.endTime)}h` : '-'}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center"><Paperclip size={16} className="mr-2"/> Professional Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {currentDoctor.documents?.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center overflow-hidden">
                        <div className="p-2 bg-gray-100 rounded-lg mr-3 text-gray-500"><FileText size={16}/></div>
                        <div className="min-w-0">
                           <p className="text-xs font-bold text-gray-700 truncate">{doc.name}</p>
                           <p className="text-[10px] text-gray-400 uppercase tracking-wider">{doc.type}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeDoc(idx)} className="text-gray-300 hover:text-red-500 transition p-2">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
                <label className="cursor-pointer border-2 border-dashed border-gray-200 text-gray-500 p-4 rounded-xl hover:border-primary hover:bg-primary/5 hover:text-primary transition flex flex-col items-center justify-center text-center">
                  <Upload size={20} className="mb-2" />
                  <span className="text-xs font-bold">Click to upload license or certification</span>
                  <span className="text-[10px] opacity-70 mt-1">Supports images and PDF (Max 1.5MB)</span>
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleDocUpload} />
                </label>
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Biography</label>
                  <textarea className={inputClass} rows={3} value={currentDoctor.bio || ''} onChange={e => setCurrentDoctor({...currentDoctor, bio: e.target.value})} placeholder="Professional background..." />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold transition">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-secondary font-bold shadow-lg shadow-primary/30 transition transform active:scale-95">Save Doctor Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;