import React, { useState, useEffect } from 'react';
import { Doctor, DaySchedule } from '../types';
import { getDoctors, saveDoctor, deleteDoctor } from '../services/db';
import { generateId, formatCurrency, fileToBase64 } from '../services/utils';
import { getFileFromDisk } from '../services/storage';
import { Plus, Trash2, Edit2, X, Upload, FileText, Image as ImageIcon, Download, Copy, Clock } from 'lucide-react';

const Doctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState<Partial<Doctor>>({});

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
    if (!currentDoctor.schedule) return;
    const mon = currentDoctor.schedule.find(d => d.day === 'Mon');
    if (!mon) return;

    const newSchedule = currentDoctor.schedule.map(d => {
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
    
    // Viewport: 06:00 to 22:00 (16 hours = 960 mins)
    const viewStart = 6 * 60; 
    const range = 16 * 60;

    let left = ((startMins - viewStart) / range) * 100;
    let width = ((endMins - startMins) / range) * 100;

    // Clamp values
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

  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Doctor Management</h2>
        <button 
          onClick={() => { setCurrentDoctor({ schedule: createDefaultSchedule() }); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-secondary"
        >
          <Plus size={18} />
          <span>Add Doctor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map(doc => {
          const photoUrl = getFileFromDisk(doc.photo);
          return (
            <div key={doc.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                      {photoUrl ? (
                        <img src={photoUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 truncate">{doc.name}</h3>
                      <span className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-1 rounded mt-1">{doc.specialty}</span>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                      <button onClick={() => handleEdit(doc)} className="text-gray-400 hover:text-blue-500 p-1"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Fee:</strong> {formatCurrency(doc.consultationFee)}</p>
                  <p><strong>Phone:</strong> {doc.phone}</p>
                  <div className="mt-2">
                    <strong className="text-gray-700 block mb-1">Availability:</strong>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      {doc.schedule && doc.schedule.filter(s => s.isWorking).map(s => (
                        <div key={s.day} className="flex justify-between text-gray-500">
                            <span className="font-semibold w-8">{s.day}</span>
                            <span>{s.startTime} - {s.endTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {doc.documents && doc.documents.length > 0 && (
                    <div className="pt-2 border-t border-gray-50 mt-2">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Attachments ({doc.documents.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.documents.map((d, i) => {
                          const docUrl = getFileFromDisk(d.data);
                          return (
                            <a key={i} href={docUrl} download={d.name} className="flex items-center space-x-1 text-xs bg-gray-50 border px-2 py-1 rounded text-blue-600 hover:bg-gray-100">
                              <Download size={10} />
                              <span className="truncate max-w-[80px]">{d.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">{currentDoctor.id ? 'Edit Doctor' : 'New Doctor'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="flex items-center space-x-6">
                 <div className="w-24 h-24 rounded-full bg-gray-100 border flex items-center justify-center overflow-hidden">
                   {currentDoctor.photo ? (
                     <img src={getFileFromDisk(currentDoctor.photo)} className="w-full h-full object-cover" />
                   ) : (
                     <span className="text-gray-400 text-xs text-center p-2">No Photo</span>
                   )}
                 </div>
                 <div>
                   <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 inline-flex items-center text-sm">
                      <Upload size={16} className="mr-2" />
                      Upload Photo
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                   </label>
                   {currentDoctor.photo && <button type="button" onClick={() => setCurrentDoctor({...currentDoctor, photo: undefined})} className="text-red-500 text-xs block mt-2 hover:underline">Remove</button>}
                 </div>
              </div>

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
                    <option value="Neurology">Neurology</option>
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
              
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800">Weekly Schedule</label>
                    <p className="text-xs text-gray-500">Set availability for appointments.</p>
                  </div>
                  <button type="button" onClick={copyMonToWeekdays} className="text-xs flex items-center text-primary hover:text-secondary font-medium">
                     <Copy size={12} className="mr-1" />
                     Copy Monday to M-F
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(currentDoctor.schedule || createDefaultSchedule()).map((day, idx) => (
                    <div key={day.day} className="flex items-center bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:border-blue-200 transition-colors">
                      {/* Day Checkbox */}
                      <label className="flex items-center w-28 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.isWorking}
                          onChange={e => handleScheduleChange(idx, 'isWorking', e.target.checked)}
                          className="h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary mr-3"
                        />
                        <span className={`font-bold ${day.isWorking ? 'text-gray-800' : 'text-gray-400'}`}>{day.day}</span>
                      </label>

                      {/* Controls */}
                      <div className={`flex-1 flex items-center ${day.isWorking ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                         {/* Time Inputs */}
                         <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded border border-gray-200">
                           <input
                             type="time"
                             value={day.startTime}
                             onChange={e => handleScheduleChange(idx, 'startTime', e.target.value)}
                             className="bg-transparent text-sm font-mono focus:outline-none w-20 text-center"
                           />
                           <span className="text-gray-400 text-xs">to</span>
                           <input
                             type="time"
                             value={day.endTime}
                             onChange={e => handleScheduleChange(idx, 'endTime', e.target.value)}
                             className="bg-transparent text-sm font-mono focus:outline-none w-20 text-center"
                           />
                         </div>

                         {/* Visual Bar */}
                         <div className="flex-1 mx-4 h-3 bg-gray-100 rounded-full relative overflow-hidden hidden sm:block" title="Timeline: 06:00 to 22:00">
                            {/* Visual grid lines for 8am, 12pm, 4pm, 8pm */}
                            <div className="absolute top-0 bottom-0 left-[12.5%] border-r border-gray-200 w-px"></div>
                            <div className="absolute top-0 bottom-0 left-[37.5%] border-r border-gray-200 w-px"></div>
                            <div className="absolute top-0 bottom-0 left-[62.5%] border-r border-gray-200 w-px"></div>
                            <div className="absolute top-0 bottom-0 left-[87.5%] border-r border-gray-200 w-px"></div>
                            
                            <div 
                              className="absolute top-0 bottom-0 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full shadow-sm transition-all duration-300 opacity-90"
                              style={getBarStyles(day.startTime, day.endTime)}
                            ></div>
                         </div>

                         {/* Duration Label */}
                         <div className="w-16 text-right flex items-center justify-end text-xs text-gray-500 font-medium">
                           <Clock size={12} className="mr-1 opacity-50" />
                           {day.isWorking ? `${calculateDuration(day.startTime, day.endTime)}h` : '--'}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-400 flex justify-between px-2">
                   <span>Visual timeline represents 06:00 to 22:00</span>
                   <span>Adjust times using the inputs</span>
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <textarea className={inputClass} rows={3} value={currentDoctor.bio || ''} onChange={e => setCurrentDoctor({...currentDoctor, bio: e.target.value})} />
              </div>

              <div className="border rounded p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Bio Documents (PDFs/Images)</label>
                  <label className="cursor-pointer text-primary text-sm hover:underline font-medium">
                    + Add Document
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleDocUpload} />
                  </label>
                </div>
                <div className="space-y-2">
                  {(!currentDoctor.documents || currentDoctor.documents.length === 0) && <p className="text-xs text-gray-500 italic">No attachments.</p>}
                  {currentDoctor.documents?.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 border rounded text-sm">
                       <div className="flex items-center space-x-2 truncate">
                         {doc.type === 'pdf' ? <FileText size={16} className="text-red-500" /> : <ImageIcon size={16} className="text-blue-500" />}
                         <span className="truncate max-w-[200px]">{doc.name}</span>
                       </div>
                       <button type="button" onClick={() => removeDoc(idx)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                  ))}
                </div>
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