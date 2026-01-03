import React, { useState, useEffect } from 'react';
import { Patient, Gender, MedicalRecord } from '../types';
import { getPatients, savePatient, deletePatient } from '../services/db';
import { generateId } from '../services/utils';
import { Plus, Trash2, Edit2, X, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Partial<Patient>>({});
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // History form state
  const [newHistory, setNewHistory] = useState<Partial<MedicalRecord>>({});

  useEffect(() => {
    setPatients(getPatients());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient.name) return;

    const patToSave: Patient = {
      id: currentPatient.id || generateId(),
      name: currentPatient.name!,
      email: currentPatient.email || '',
      phone: currentPatient.phone || '',
      age: Number(currentPatient.age) || 0,
      dateOfBirth: currentPatient.dateOfBirth,
      gender: currentPatient.gender || Gender.Other,
      address: currentPatient.address || '',
      history: currentPatient.history || []
    };

    savePatient(patToSave);
    setPatients(getPatients());
    setIsModalOpen(false);
    setCurrentPatient({});
  };

  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    let age = currentPatient.age;
    
    if (dob) {
      // Calculate Age
      age = differenceInYears(new Date(), parseISO(dob));
    }
    
    setCurrentPatient({ ...currentPatient, dateOfBirth: dob, age });
  };

  const handleAddHistory = (patientId: string) => {
    if (!newHistory.condition) return;
    
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const record: MedicalRecord = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      condition: newHistory.condition!,
      treatment: newHistory.treatment || '',
      allergies: newHistory.allergies || '',
      medications: newHistory.medications || ''
    };

    const updatedPatient = { ...patient, history: [...patient.history, record] };
    savePatient(updatedPatient);
    setPatients(getPatients());
    setNewHistory({});
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded mt-1 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Patient Management</h2>
        <button 
          onClick={() => { setCurrentPatient({ gender: Gender.Male }); setIsModalOpen(true); }}
          className="bg-primary text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-secondary"
        >
          <Plus size={18} />
          <span>Register Patient</span>
        </button>
      </div>

      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Search patients by name or phone..." 
          className="w-full max-w-md bg-white text-gray-900 border border-gray-300 p-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm font-medium">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Age / DOB</th>
              <th className="p-4">Contact</th>
              <th className="p-4 text-center">History</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPatients.map(pat => (
              <React.Fragment key={pat.id}>
                <tr className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{pat.name} <br/> <span className="text-xs text-gray-400">{pat.gender}</span></td>
                  <td className="p-4 text-gray-600">
                     <span className="font-bold text-gray-800">{pat.age} Years</span>
                     {pat.dateOfBirth && <div className="text-xs text-gray-400">Born: {pat.dateOfBirth}</div>}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <div>{pat.phone}</div>
                    <div className="text-xs text-gray-400">{pat.email}</div>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setViewHistoryId(viewHistoryId === pat.id ? null : pat.id)}
                      className="text-primary hover:text-secondary flex items-center justify-center space-x-1 mx-auto"
                    >
                      <FileText size={16} />
                      <span>{pat.history.length}</span>
                      {viewHistoryId === pat.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => { setCurrentPatient({...pat}); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                    <button onClick={() => { if(confirm('Delete patient?')) { deletePatient(pat.id); setPatients(getPatients()); }}} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </td>
                </tr>
                {viewHistoryId === pat.id && (
                  <tr className="bg-teal-50">
                    <td colSpan={5} className="p-4">
                      <div className="mb-4">
                        <h4 className="font-bold text-teal-800 mb-2">Medical History</h4>
                        {pat.history.length === 0 ? <p className="text-sm text-gray-500">No records found.</p> : (
                          <div className="space-y-2">
                            {pat.history.map(h => (
                              <div key={h.id} className="bg-white p-3 rounded border border-teal-100 text-sm">
                                <div className="flex justify-between font-semibold text-gray-700">
                                  <span>{h.condition}</span>
                                  <span className="text-gray-400">{h.date}</span>
                                </div>
                                <div className="mt-1 text-gray-600">Rx: {h.treatment}</div>
                                {(h.allergies || h.medications) && (
                                  <div className="mt-1 text-xs text-red-500">
                                    {h.allergies && <span className="mr-2">⚠ Allergies: {h.allergies}</span>}
                                    {h.medications && <span>💊 Meds: {h.medications}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <h5 className="text-sm font-bold mb-2">Add New Record</h5>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input placeholder="Condition" className="bg-white border-gray-300 border p-1 rounded text-sm text-gray-900" value={newHistory.condition || ''} onChange={e => setNewHistory({...newHistory, condition: e.target.value})} />
                          <input placeholder="Treatment" className="bg-white border-gray-300 border p-1 rounded text-sm text-gray-900" value={newHistory.treatment || ''} onChange={e => setNewHistory({...newHistory, treatment: e.target.value})} />
                          <input placeholder="Allergies" className="bg-white border-gray-300 border p-1 rounded text-sm text-gray-900" value={newHistory.allergies || ''} onChange={e => setNewHistory({...newHistory, allergies: e.target.value})} />
                          <input placeholder="Current Meds" className="bg-white border-gray-300 border p-1 rounded text-sm text-gray-900" value={newHistory.medications || ''} onChange={e => setNewHistory({...newHistory, medications: e.target.value})} />
                        </div>
                        <button onClick={() => handleAddHistory(pat.id)} className="bg-teal-600 text-white text-xs px-3 py-1 rounded">Add Record</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{currentPatient.id ? 'Edit Patient' : 'New Patient'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Full Name</label>
                <input required className={inputClass} value={currentPatient.name || ''} onChange={e => setCurrentPatient({...currentPatient, name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium">Date of Birth</label>
                    <input 
                      type="date" 
                      className={inputClass} 
                      value={currentPatient.dateOfBirth || ''} 
                      onChange={handleDateOfBirthChange} 
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium">Age</label>
                    <input 
                      type="number" 
                      className={`${inputClass} bg-gray-50`} 
                      value={currentPatient.age || ''} 
                      onChange={e => setCurrentPatient({...currentPatient, age: Number(e.target.value)})} 
                      // Age is calculated but can be overridden if needed
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium">Gender</label>
                    <select className={inputClass} value={currentPatient.gender} onChange={e => setCurrentPatient({...currentPatient, gender: e.target.value as Gender})}>
                      <option value={Gender.Male}>Male</option>
                      <option value={Gender.Female}>Female</option>
                      <option value={Gender.Other}>Other</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium">Phone</label>
                    <input className={inputClass} value={currentPatient.phone || ''} onChange={e => setCurrentPatient({...currentPatient, phone: e.target.value})} />
                 </div>
              </div>
              <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input className={inputClass} value={currentPatient.email || ''} onChange={e => setCurrentPatient({...currentPatient, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium">Address</label>
                <textarea className={inputClass} rows={2} value={currentPatient.address || ''} onChange={e => setCurrentPatient({...currentPatient, address: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;