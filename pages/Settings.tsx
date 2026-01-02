import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, resetDatabase } from '../services/db';
import { AppSettings } from '../types';
import { AlertTriangle, Save, Palette, Bell, Store, Check } from 'lucide-react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'danger'>('general');

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    alert('Settings saved successfully!');
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
        <div className="flex border-b border-gray-100 px-6">
          <TabButton id="general" icon={Store} label="Clinic Info" />
          <TabButton id="appearance" icon={Palette} label="Appearance" />
          <TabButton id="notifications" icon={Bell} label="Notifications" />
          <TabButton id="danger" icon={AlertTriangle} label="Data Management" />
        </div>

        <div className="p-8 min-h-[400px]">
          {/* General Tab */}
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
                <button onClick={handleSave} className="bg-primary text-white px-6 py-2 rounded flex items-center hover:bg-secondary">
                  <Save size={18} className="mr-2" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
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
                <div className="mt-6 p-4 bg-gray-50 rounded border">
                   <p className="text-sm text-gray-600 mb-2">Preview:</p>
                   <button className="text-white px-4 py-2 rounded mr-2" style={{ backgroundColor: settings.primaryColor }}>Primary Button</button>
                   <button className="text-white px-4 py-2 rounded" style={{ backgroundColor: settings.secondaryColor }}>Secondary Button</button>
                </div>
              </div>
              <button onClick={handleSave} className="bg-primary text-white px-6 py-2 rounded flex items-center hover:bg-secondary transition-colors duration-300">
                <Save size={18} className="mr-2" /> Apply Theme
              </button>
            </div>
          )}

          {/* Notifications Tab */}
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

               <button onClick={handleSave} className="bg-primary text-white px-6 py-2 rounded flex items-center hover:bg-secondary">
                  <Save size={18} className="mr-2" /> Save Templates
               </button>
             </div>
          )}

          {/* Danger Tab */}
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
    </div>
  );
};

export default Settings;