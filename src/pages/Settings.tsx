import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, resetDatabase, getUsers, saveUser, deleteUser, getDoctors, exportDatabaseBinary, importDatabaseBinary } from '../services/db';
import { AppSettings, User, Role, Doctor } from '../types';
import { AlertTriangle, Save, Palette, Bell, Store, Upload, Users, UserPlus, Trash2, Edit2, X, Shield, Database, Download, RefreshCw } from 'lucide-react';
import { fileToBase64, generateId, hashPassword } from '../services/utils';
import { getFileFromDisk } from '../services/storage';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'users' | 'maintenance'>('general');
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [userPassword, setUserPassword] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      setUsers(getUsers());
      setDoctors(getDoctors());
    }
  }, [activeTab]);

  const handleSaveSettings = () => {
    saveSettings(settings);
    alert('Preferences synchronized successfully.');
  };

  const handleExportDB = () => {
    const data = exportDatabaseBinary();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicore_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
    link.click();
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!confirm("This will overwrite your current clinic database with the uploaded backup. Continue?")) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const u8 = new Uint8Array(reader.result as ArrayBuffer);
        await importDatabaseBinary(u8);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.name || !currentUser.email) return;
    const finalPass = userPassword ? hashPassword(userPassword) : currentUser.password;
    saveUser({
      ...currentUser,
      id: currentUser.id || generateId(),
      name: currentUser.name!,
      email: currentUser.email!,
      role: currentUser.role!,
      password: finalPass
    } as User);
    setUsers(getUsers());
    setIsUserModalOpen(false);
    setUserPassword('');
  };

  const TabButton = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-bold transition whitespace-nowrap ${
        activeTab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  const inputClass = "w-full bg-white text-gray-900 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-primary outline-none transition";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10">
      <h2 className="text-3xl font-black text-gray-800">System Control Panel</h2>
      
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto no-scrollbar">
          <TabButton id="general" icon={Store} label="Clinic Info" />
          <TabButton id="appearance" icon={Palette} label="Branding" />
          <TabButton id="users" icon={Users} label="Accounts" />
          <TabButton id="notifications" icon={Bell} label="Messaging" />
          <TabButton id="maintenance" icon={Database} label="Maintenance" />
        </div>

        <div className="p-10">
          {activeTab === 'general' && (
            <div className="max-w-lg space-y-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Clinic Identity</label>
                <input type="text" value={settings.clinicName} onChange={e => setSettings({...settings, clinicName: e.target.value})} className={inputClass} />
                <p className="text-xs text-gray-400 mt-2 italic">This name appears on official reports, prescriptions, and navigation.</p>
              </div>
              <button onClick={handleSaveSettings} className="bg-primary text-white px-8 py-3 rounded-2xl font-black hover:bg-secondary transition flex items-center">
                <Save size={18} className="mr-2" /> Commit Identity Changes
              </button>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-10">
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center">
                   <Database size={24} className="mr-3 text-primary" /> Data Sovereignty & Backups
                </h3>
                <p className="text-gray-600 mb-6 max-w-2xl text-sm font-medium">Protect your clinic data by performing regular binary exports. These files can be restored to any MediCore instance to recover your entire patient database and settings.</p>
                
                <div className="flex flex-wrap gap-4">
                   <button onClick={handleExportDB} className="bg-white border-2 border-primary text-primary px-6 py-3 rounded-2xl font-black hover:bg-primary hover:text-white transition flex items-center">
                     <Download size={18} className="mr-2"/> Download Binary Backup (.sqlite)
                   </button>
                   
                   <label className="cursor-pointer bg-slate-800 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-900 transition flex items-center">
                     <RefreshCw size={18} className="mr-2"/> Restore from Backup
                     <input type="file" accept=".sqlite,.bin" className="hidden" onChange={handleImportDB} />
                   </label>
                </div>
              </div>

              <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
                <h3 className="text-xl font-black text-red-800 mb-2 flex items-center">
                   <AlertTriangle size={24} className="mr-3 text-red-500" /> Factory Data Reset
                </h3>
                <p className="text-red-600/70 mb-6 text-sm font-medium">Permanently erase all clinical data, accounts, and images. Revert system to a clean installation state.</p>
                <button onClick={() => { if(confirm('IRREVERSIBLE: Are you strictly sure you want to wipe the system?')) resetDatabase(); }} className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-red-700 transition">
                  Destroy All Local Data
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
             <div className="space-y-8">
               <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest">Account Governance</h3>
                 <button onClick={() => { setCurrentUser({ role: Role.Receptionist }); setIsUserModalOpen(true); }} className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold flex items-center hover:bg-secondary">
                   <UserPlus size={18} className="mr-2" /> New Account
                 </button>
               </div>
               
               <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest">
                     <tr>
                       <th className="p-5">Entity Name</th>
                       <th className="p-5">Security Role</th>
                       <th className="p-5">Login ID</th>
                       <th className="p-5 text-right">Administrative Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {users.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50 transition">
                         <td className="p-5 font-bold text-gray-800">{u.name}</td>
                         <td className="p-5">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                             u.role === Role.Admin ? 'bg-purple-50 text-purple-700 border-purple-200' :
                             u.role === Role.Doctor ? 'bg-blue-50 text-blue-700 border-blue-200' :
                             u.role === Role.Billing ? 'bg-amber-50 text-amber-700 border-amber-200' :
                             'bg-gray-100 text-gray-600 border-gray-200'
                           }`}>{u.role}</span>
                         </td>
                         <td className="p-5 text-gray-500 font-mono">{u.email}</td>
                         <td className="p-5 text-right space-x-3">
                            <button onClick={() => { setCurrentUser(u); setUserPassword(''); setIsUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 transition"><Edit2 size={18} /></button>
                            <button onClick={() => { if(confirm('Terminate account?')) { deleteUser(u.id); setUsers(getUsers()); }}} className="text-red-400 hover:text-red-700 transition"><Trash2 size={18} /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Primary Palette</label>
                    <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-3xl border">
                       <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="h-14 w-20 rounded-xl cursor-pointer border-0 ring-4 ring-white" />
                       <span className="font-mono text-xl font-bold text-gray-700">{settings.primaryColor}</span>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Hover / Accent Palette</label>
                    <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-3xl border">
                       <input type="color" value={settings.secondaryColor} onChange={e => setSettings({...settings, secondaryColor: e.target.value})} className="h-14 w-20 rounded-xl cursor-pointer border-0 ring-4 ring-white" />
                       <span className="font-mono text-xl font-bold text-gray-700">{settings.secondaryColor}</span>
                    </div>
                 </div>
              </div>
              <button onClick={handleSaveSettings} className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-secondary transition shadow-xl shadow-primary/30">Apply Branding Refactor</button>
            </div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
             <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black text-gray-800">{currentUser.id ? 'Modify Account' : 'Provision Account'}</h3>
                   <button onClick={() => setIsUserModalOpen(false)} className="bg-gray-100 p-2 rounded-full hover:rotate-90 transition duration-300"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveUser} className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                      <input required className={inputClass} value={currentUser.name || ''} onChange={e => setCurrentUser({...currentUser, name: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Login Identifier</label>
                      <input required className={inputClass} value={currentUser.email || ''} onChange={e => setCurrentUser({...currentUser, email: e.target.value})} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Secret Credential {currentUser.id && '(Leave blank to retain)'}</label>
                      <input type="password" className={inputClass} value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder={currentUser.id ? '********' : 'Enter strong password'} />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Permission Tier</label>
                      <select className={inputClass} value={currentUser.role} onChange={e => setCurrentUser({...currentUser, role: e.target.value as Role})}>
                         {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                   </div>
                   <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-secondary transition shadow-lg shadow-primary/20">Finalize Provisions</button>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;