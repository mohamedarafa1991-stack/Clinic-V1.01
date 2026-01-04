import React, { useState, useEffect } from 'react';
import { Patient, Gender, MedicalRecord } from '../types';
import { getPatients, savePatient, deletePatient, getSettings } from '../services/db';
import { generateId, printElement, exportToCSV, exportToExcel, exportToPDF } from '../services/utils';
import { Plus, Trash2, Edit2, X, FileText, Printer, UserCircle, Wand2, Phone, Mail, Table, FileSpreadsheet } from 'lucide-react';
import { differenceInYears, parseISO, format } from 'date-fns';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Partial<Patient>>({});
  const [viewHistoryId, setViewHistoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newHistory, setNewHistory] = useState<Partial<MedicalRecord>>({});
  const settings = getSettings();

  useEffect(() => {
    setPatients(getPatients());
  }, []);

  const handleMagicFill = () => {
    const fakes = [
      { name: 'Adam Thorne', email: 'adam@thorne.com', phone: '01011112222', dob: '1988-10-12', gender: Gender.Male, address: '55 Ocean Ave, Alexandria' },
      { name: 'Sophia Loren', email: 'sophia@loren.it', phone: '01155556666', dob: '1995-02-28', gender: Gender.Female, address: 'Villa 12, Maadi, Cairo' },
      { name: 'Marcus Aurelius', email: 'marcus@legacy.org', phone: '01299990000', dob: '1970-01-01', gender: Gender.Male, address: 'The Forum, Rome St, Cairo' }
    ];
    const pick = fakes[Math.floor(Math.random() * fakes.length)];
    const age = differenceInYears(new Date(), parseISO(pick.dob));
    setCurrentPatient(prev => ({ ...prev, ...pick, age }));
  };

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

  const handleAddHistory = (patientId: string) => {
    if (!newHistory.condition) return;
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const record: MedicalRecord = {
      id: generateId(),
      date: format(new Date(), 'yyyy-MM-dd'),
      condition: newHistory.condition!,
      treatment: newHistory.treatment || '',
      allergies: newHistory.allergies || '',
      medications: newHistory.medications || ''
    };

    savePatient({ ...patient, history: [record, ...patient.history] });
    setPatients(getPatients());
    setNewHistory({});
  };

  const handlePrintRecord = (pat: Patient) => {
    setViewHistoryId(pat.id);
    setTimeout(() => printElement(`Medical_Record_${pat.name.replace(/\s/g, '_')}`), 100);
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (!patients.length) return;
    const data = patients.map(p => ({
        "Name": p.name,
        "Age": p.age,
        "Gender": p.gender,
        "Phone": p.phone,
        "Email": p.email,
        "Records": p.history.length
    }));
    const fname = "Patient_Registry";
    if (type === 'csv') exportToCSV(fname + '.csv', data);
    if (type === 'excel') exportToExcel(fname + '.xlsx', data);
    if (type === 'pdf') exportToPDF(fname + '.pdf', "Patient Registry", data);
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm));
  const inputClass = "w-full bg-white text-gray-900 border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-shadow";

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center no-print">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Patient Registry</h2>
            <p className="text-sm text-gray-500">Subject diagnostics and clinical logs</p>
          </div>
          <div className="flex space-x-3">
             <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                 <button onClick={() => handleExport('csv')} className="p-2 hover:bg-gray-50 text-gray-500 rounded-lg" title="Export CSV"><Table size={18}/></button>
                 <button onClick={() => handleExport('excel')} className="p-2 hover:bg-gray-50 text-green-600 rounded-lg" title="Export Excel"><FileSpreadsheet size={18}/></button>
                 <button onClick={() => handleExport('pdf')} className="p-2 hover:bg-gray-50 text-red-500 rounded-lg" title="Export PDF"><FileText size={18}/></button>
             </div>
             <button 
                onClick={() => { setCurrentPatient({ gender: Gender.Male }); setIsModalOpen(true); }}
                className="bg-primary text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-secondary transition shadow-sm"
            >
                <Plus size={18} />
                <span className="font-bold">Enroll Subject</span>
            </button>
          </div>
        </div>

        <div className="no-print">
          <div className="relative max-w-md">
            <input 
              type="text" 
              placeholder="Search by identity name or phone..." 
              className="w-full bg-white border border-gray-200 p-3 pl-10 rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <UserCircle className="absolute left-3 top-3 text-gray-300" size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="p-5">Subject</th>
                  <th className="p-5">Vitals</th>
                  <th className="p-5">Contact</th>
                  <th className="p-5 text-center">Log</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPatients.map(pat => (
                  <React.Fragment key={pat.id}>
                    <tr className="hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => setViewHistoryId(viewHistoryId === pat.id ? null : pat.id)}>
                      <td className="p-5">
                        <div className="font-bold text-gray-800 group-hover:text-primary transition-colors">{pat.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{pat.gender}</div>
                      </td>
                      <td className="p-5">
                        <div className="text-sm font-bold text-gray-700">{pat.age} Years</div>
                        <div className="text-[10px] text-gray-400">{pat.dateOfBirth || '--'}</div>
                      </td>
                      <td className="p-5 text-xs text-gray-500">
                        <div className="flex items-center"><Phone size={12} className="mr-1.5 opacity-40"/> {pat.phone}</div>
                        <div className="flex items-center mt-1"><Mail size={12} className="mr-1.5 opacity-40"/> {pat.email}</div>
                      </td>
                      <td className="p-5 text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setViewHistoryId(viewHistoryId === pat.id ? null : pat.id)} className="bg-primary/5 text-primary px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition">
                          {pat.history.length} Events {viewHistoryId === pat.id ? '↑' : '↓'}
                        </button>
                      </td>
                      <td className="p-5 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setCurrentPatient(pat); setIsModalOpen(true); }} className="p-2 text-gray-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                        <button onClick={() => { if(confirm('Erase record?')) { deletePatient(pat.id); setPatients(getPatients()); }}} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                    {viewHistoryId === pat.id && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={5} className="p-8 border-b-2 border-gray-100">
                          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-black tracking-widest uppercase text-gray-400">Clinical Timeline</h4>
                              <button onClick={() => handlePrintRecord(pat)} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-50 transition shadow-sm flex items-center">
                                <Printer size={14} className="mr-2"/> Generate Report
                              </button>
                            </div>
                            {pat.history.length === 0 ? <div className="p-12 text-center text-gray-300 italic text-sm">No history recorded for this subject.</div> : (
                              <div className="space-y-4">
                                {pat.history.map(h => (
                                  <div key={h.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></div>
                                    <div className="flex justify-between mb-3">
                                      <h5 className="font-bold text-gray-800">{h.condition}</h5>
                                      <span className="text-[10px] font-black text-gray-300 uppercase">{format(parseISO(h.date), 'dd MMM yyyy')}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">{h.treatment}</p>
                                    {(h.allergies || h.medications) && (
                                       <div className="mt-4 p-4 bg-red-50 rounded-xl font-bold text-red-600 text-xs border border-red-100 flex flex-wrap gap-4">
                                         {h.allergies && <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></span> ALLERGY: {h.allergies}</span>}
                                         {h.medications && <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></span> MEDS: {h.medications}</span>}
                                       </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200">
                              <h5 className="text-[10px] font-black mb-4 uppercase tracking-widest text-gray-400">+ Add Clinical Observation</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                  <input placeholder="Clinical Diagnosis" className={inputClass + " text-sm"} value={newHistory.condition || ''} onChange={e => setNewHistory({...newHistory, condition: e.target.value})} />
                                  <input placeholder="Contraindications (Allergies)" className={inputClass + " text-sm"} value={newHistory.allergies || ''} onChange={e => setNewHistory({...newHistory, allergies: e.target.value})} />
                                </div>
                                <div className="space-y-4">
                                  <input placeholder="Management Protocol" className={inputClass + " text-sm"} value={newHistory.treatment || ''} onChange={e => setNewHistory({...newHistory, treatment: e.target.value})} />
                                  <input placeholder="Active Regimen (Meds)" className={inputClass + " text-sm"} value={newHistory.medications || ''} onChange={e => setNewHistory({...newHistory, medications: e.target.value})} />
                                </div>
                              </div>
                              <button onClick={() => handleAddHistory(pat.id)} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest mt-4 hover:bg-secondary transition shadow-lg shadow-primary/20">Commit to Registry</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">{currentPatient.id ? 'Modify Record' : 'Enroll Subject'}</h3>
                  {!currentPatient.id && (
                    <button type="button" onClick={handleMagicFill} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition group" title="Auto-fill Dummy Data">
                      <Wand2 className="text-primary group-hover:rotate-12 transition-transform" size={18}/>
                    </button>
                  )}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform p-2 rounded-full hover:bg-gray-50"><X size={20} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Legal Identity</label>
                    <input required className={inputClass} placeholder="Full legal name" value={currentPatient.name || ''} onChange={e => setCurrentPatient({...currentPatient, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Identity DOB</label>
                      <input type="date" className={inputClass} value={currentPatient.dateOfBirth || ''} onChange={e => {
                        const dob = e.target.value;
                        const age = dob ? differenceInYears(new Date(), parseISO(dob)) : 0;
                        setCurrentPatient({...currentPatient, dateOfBirth: dob, age});
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Calculated Age</label>
                      <input type="number" placeholder="Years" className={inputClass} value={currentPatient.age || ''} onChange={e => setCurrentPatient({...currentPatient, age: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gender Identification</label>
                      <select className={inputClass} value={currentPatient.gender} onChange={e => setCurrentPatient({...currentPatient, gender: e.target.value as Gender})}>
                        <option value={Gender.Male}>Male</option><option value={Gender.Female}>Female</option><option value={Gender.Other}>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Connectivity Phone</label>
                      <input className={inputClass} placeholder="+20..." value={currentPatient.phone || ''} onChange={e => setCurrentPatient({...currentPatient, phone: e.target.value})} />
                    </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Connectivity Email (Optional)</label>
                     <input type="email" className={inputClass} placeholder="patient@example.com" value={currentPatient.email || ''} onChange={e => setCurrentPatient({...currentPatient, email: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Residential Trace Address</label>
                     <input className={inputClass} placeholder="Current place of residence" value={currentPatient.address || ''} onChange={e => setCurrentPatient({...currentPatient, address: e.target.value})} />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                   <button type="submit" className="w-full md:w-auto px-8 bg-primary text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-secondary transition-all transform active:scale-95">Finalize Subject Enrollment</button>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  );
};

export default Patients;