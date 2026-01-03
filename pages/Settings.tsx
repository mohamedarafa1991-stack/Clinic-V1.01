import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, resetDatabase, getUsers, saveUser, deleteUser, getDoctors } from '../services/db';
import { AppSettings, User, Role, Doctor } from '../types';
import { AlertTriangle, Save, Palette, Bell, Store, Upload, Users, UserPlus, Trash2, Edit2, X, Shield, Lock } from 'lucide-react';
import { fileToBase64, generateId, hashPassword } from '../services/utils';
import { getFileFromDisk } from '../services/storage';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'users' | 'danger'>('general');
  const [users, setUsers] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [userPassword, setUserPassword] = useState('');

  useEffect(() => {
    setSettings(getSettings());
    if (activeTab === 'users') {
      setUsers(getUsers());
      setDoctors(getDoctors());
    }
  }, [activeTab]);

  const handleSaveSettings = () => {
    saveSettings(settings);
    alert('Settings saved successfully!');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const path = await fileToBase64(file);
        setSettings({ ...settings, logo: path });
      } catch (err) {
        alert('Error uploading file. Disk full?');
      }
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.name || !currentUser.email || !currentUser.role) return;
    
    if (!currentUser.id && !userPassword) {
      alert("Password is required for new users");
      return;
    }

    const finalPassword = userPassword ? hashPassword(userPassword) : currentUser.password;

    const userToSave: User = {
      id: currentUser.id || generateId(),
      name: currentUser.name!,
      email: currentUser.email!,
      role: currentUser.role!,
      password: finalPassword,
      relatedId: currentUser.role === Role.Doctor ? currentUser.relatedId : undefined
    };

    saveUser(userToSave);
    setUsers(getUsers());
    setIsUserModalOpen(false);
    setCurrentUser({});
    setUserPassword('');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser(id);
      setUsers(getUsers());
    }
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setCurrentUser(user);
      setUserPassword('');
    } else {
      setCurrentUser({ role: Role.Receptionist });
      setUserPassword('');
    }
    setIsUserModalOpen(true);
  };

  const TabButton = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition ${
        activeTab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  const inputClass = "w-full bg-white text-gray-900 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none";

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">System Preferences</h2>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 px-6 overflow-x-auto">
          <TabButton id="general" icon={Store} label="Clinic Info" />
          <TabButton id="appearance" icon={Palette} label="Appearance" />
          <TabButton id="users" icon={Users} label="Users" />
          <TabButton id="notifications" icon={Bell} label="Notifications" />
          <TabButton id="danger" icon={AlertTriangle} label="Data" />
        </div>

        <div className="p-8 min-h-[400px]">
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Clinic Name</label>
                <input 
                  type="text" 
                  value={settings.clinicName} 
                  onChange={e => setSettings({...settings, clinicName: e.target.value})}
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1">This appears on the login screen, sidebar, and emails.</p>
              </div>
              <div className="pt-4">
                <button onClick={handleSaveSettings} className="bg-primary text-white px-6 py-2 rounded flex items-center hover:bg-secondary">
                  <Save size={18} className="mr-2" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Branding</h3>
                
                <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Clinic Logo</label>
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 rounded bg-white border flex items-center justify-center overflow-hidden">
                       {settings.logo ? (
                         <img src={getFileFromDisk(settings.logo)} alt="Logo" className="w-full h-full object-contain" />
                       ) : (
                         <span className="text-gray-300 text-xs">No Logo</span>
                       )}
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50 inline-flex items-center">
                        <Upload size={16} className="mr-2" />
                        <span>Upload Logo</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Recommended size: 200x200px. Max 1.5MB.</p>
                      {settings.logo && (
                        <button 
                          onClick={() => setSettings({...settings, logo: undefined})}
                          className="text-red-500 text-xs mt-2 hover:underline"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-4">Color Theme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Brand Color</label>
                     <div className="flex items-center space-x-3">
                       <input 
                         type="color" 
                         value={settings.primaryColor} 
                         onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                         className="h-10 w-20 rounded cursor-pointer border-0"
                       />
                       <span className="font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{settings.primaryColor}</span>
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-2">Secondary / Hover Color</label>
                     <div className="flex items-center space-x-3">
                       <input 
                         type="color" 
                         value={settings.secondaryColor} 
                         onChange={e => setSettings({...settings, secondaryColor: e.target.value})}
                         className="h-10 w-20 rounded cursor-pointer border-0"
                       />
                       <span className="font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">{settings.secondaryColor}</span>
                     </div>
                   </div>
                </div>
              </div>
              <button onClick={handleSaveSettings} className="bg-primary text-white px-6 py-2 rounded flex items-center hover:bg-secondary transition-colors duration-300">
                <Save size={18} className="mr-2" /> Apply Changes
              </button>
            </div>
          )}

          {activeTab === 'users' && (
             <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-800">User Management</h3>
                 <button onClick={() => openUserModal()} className="bg-primary text-white px-3 py-2 rounded text-sm flex items-center hover:bg-secondary">
                   <UserPlus size={16} className="mr-2" /> Add User
                 </button>
               </div>
               
               <div className="border rounded-lg overflow-hidden shadow-sm">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-500">
                     <tr>
                       <th className="p-3">Name</th>
                       <th className="p-3">Role</th>
                       <th className="p-3">Username/Email</th>
                       <th className="p-3 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                     {users.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50">
                         <td className="p-3 font-medium text-gray-800">{u.name}</td>
                         <td className="p-3">
                           <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                             u.role === Role.Admin ? 'bg-purple-100 text-purple-700' :
                             u.role === Role.Doctor ? 'bg-blue-100 text-blue-700' :
                             u.role === Role.Billing ? 'bg-amber-100 text-amber-700' :
                             'bg-gray-100 text-gray-700'
                           }`}>{u.role}</span>
                         </td>
                         <td className="p-3 text-gray-600">{u.email}</td>
                         <td className="p-3 text-right space-x-2">
                            <button onClick={() => openUserModal(u)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* Role Permissions Guide */}
               <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mt-6">
                 <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center">
                   <Shield size={18} className="mr-2 text-primary" /> Role Access Permissions
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                   <div className="bg-white p-4 rounded border border-gray-100 shadow-sm">
                     <span className="font-bold text-purple-700 block mb-2 flex items-center"><Lock size={14} className="mr-1"/> Admin</span>
                     <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
                       <li>Full System Control & Configuration</li>
                       <li>Manage Users & Roles</li>
                       <li>View Financial Reports & Analytics</li>
                       <li>Access All Medical Records</li>
                     </ul>
                   </div>
                   <div className="bg-white p-4 rounded border border-gray-100 shadow-sm">
                     <span className="font-bold text-gray-700 block mb-2">Receptionist</span>
                     <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
                       <li>Schedule & Manage Appointments</li>
                       <li>Register New Patients</li>
                       <li>View Doctor Availability</li>
                       <li>Send Email Notifications</li>
                     </ul>
                   </div>
                   <div className="bg-white p-4 rounded border border-gray-100 shadow-sm">
                     <span className="font-bold text-blue-700 block mb-2">Doctor</span>
                     <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
                       <li>View Personal Schedule</li>
                       <li>Access Assigned Patient History</li>
                       <li>Manage Appointment Status</li>
                       <li>Restricted from Financials</li>
                     </ul>
                   </div>
                    <div className="bg-white p-4 rounded border border-gray-100 shadow-sm">
                     <span className="font-bold text-green-700 block mb-2">Nurse</span>
                     <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
                       <li>View Patient List</li>
                       <li>Update Medical Records</li>
                       <li>View Daily Schedule</li>
                     </ul>
                   </div>
                    <div className="bg-white p-4 rounded border border-gray-100 shadow-sm">
                     <span className="font-bold text-amber-700 block mb-2">Billing</span>
                     <ul className="list-disc list-inside text-gray-600 space-y-1 text-xs">
                       <li>Access Financial Dashboard</li>
                       <li>View Revenue Reports</li>
                       <li>Track Payment Status</li>
                       <li>Export Financial Data</li>
                     </ul>
                   </div>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'notifications' && (
             <div className="space-y-6">
               <div className="flex items-center justify-between p-4 border rounded bg-gray-50">
                 <div>
                   <h4 className="font-bold text-gray-800">Automatic Reminders</h4>
                   <p className="text-sm text-gray-500">Automatically send email reminders 24 hours before scheduled appointments.</p>
                 </div>
                 <button 
                   onClick={() => setSettings({...settings, enableAutoReminders: !settings.enableAutoReminders})}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.enableAutoReminders ? 'bg-primary' : 'bg-gray-300'}`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.enableAutoReminders ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
               </div>

               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Reminder Email Template</label>
                 <textarea 
                   className={`${inputClass} font-mono text-sm`} 
                   rows={5}
                   value={settings.emailTemplates.reminder}
                   onChange={e => setSettings({...settings, emailTemplates: {...settings.emailTemplates, reminder: e.target.value}})}
                 />
                 <p className="text-xs text-gray-400 mt-1">Variables: {'{patient_name}, {doctor_name}, {date}, {time}, {clinic_name}'}</p>
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Email Template</label>
                 <textarea 
                   className={`${inputClass} font-mono text-sm`} 
                   rows={5}
                   value={settings.emailTemplates.followup}
                   onChange={e => setSettings({...settings, emailTemplates: {...settings.emailTemplates, followup: e.target.value}})}
                 />
               </div>

               <button onClick={handleSaveSettings} className="bg-primary text-white px-6 py-2 rounded flex items-center hover:bg-secondary">
                  <Save size={18} className="mr-2" /> Save Templates
               </button>
             </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded p-6">
                <h4 className="font-bold text-red-800 mb-2">Factory Reset</h4>
                <p className="text-sm text-red-600 mb-4">
                  This will permanently delete all local data, including doctors, patients, appointments, and custom settings. 
                  The app will revert to the initial demo state.
                </p>
                <button 
                  onClick={() => { if(confirm('Are you strictly sure?')) resetDatabase(); }}
                  className="bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700 transition"
                >
                  Reset Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{currentUser.id ? 'Edit User' : 'New User'}</h3>
                <button onClick={() => setIsUserModalOpen(false)}><X size={24} className="text-gray-400" /></button>
             </div>
             <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium mb-1">Full Name</label>
                   <input required className={inputClass} value={currentUser.name || ''} onChange={e => setCurrentUser({...currentUser, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Username / Email</label>
                   <input required className={inputClass} value={currentUser.email || ''} onChange={e => setCurrentUser({...currentUser, email: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Password {currentUser.id && '(Leave blank to keep current)'}</label>
                   <input 
                     type="password" 
                     className={inputClass} 
                     value={userPassword} 
                     onChange={e => setUserPassword(e.target.value)} 
                     placeholder={currentUser.id ? '********' : 'Required'}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">Role</label>
                   <select className={inputClass} value={currentUser.role} onChange={e => setCurrentUser({...currentUser, role: e.target.value as Role})}>
                      {(Object.values(Role) as string[]).map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                </div>
                {currentUser.role === Role.Doctor && (
                   <div>
                     <label className="block text-sm font-medium mb-1">Link to Doctor Profile</label>
                     <select className={inputClass} value={currentUser.relatedId || ''} onChange={e => setCurrentUser({...currentUser, relatedId: e.target.value})}>
                        <option value="">Select Doctor...</option>
                        {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                     <p className="text-xs text-gray-500 mt-1">Links this account to the specific doctor's schedule and data.</p>
                   </div>
                )}
                <div className="flex justify-end pt-4">
                   <button type="submit" className="bg-primary text-white px-4 py-2 rounded hover:bg-secondary">Save User</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;