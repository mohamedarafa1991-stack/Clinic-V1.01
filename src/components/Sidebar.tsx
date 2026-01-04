import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Stethoscope, CalendarDays, DollarSign, Activity, Mail, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { getSettings } from '../services/db';
import { getFileFromDisk } from '../services/storage';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const settings = getSettings();
  
  if (!user) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-6 py-3 transition-all duration-200 ${isActive ? 'bg-secondary text-white border-r-4 border-white font-bold' : 'text-teal-100 hover:bg-teal-800'}`;

  return (
    <div className="w-64 bg-primary text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50">
      <div className="p-6 flex items-center space-x-3 border-b border-white/10">
        <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center overflow-hidden">
          {settings.logo ? <img src={getFileFromDisk(settings.logo)} className="w-full h-full object-contain" /> : <Activity className="h-6 w-6"/>}
        </div>
        <div className="min-w-0">
          <h1 className="text-md font-bold truncate">{settings.clinicName}</h1>
          <p className="text-[10px] uppercase tracking-widest text-teal-300">{user.role}</p>
        </div>
      </div>

      <nav className="flex-1 mt-4 overflow-y-auto">
        <NavLink to="/" className={linkClass}><LayoutDashboard size={18}/><span>Dashboard</span></NavLink>
        <NavLink to="/appointments" className={linkClass}><CalendarDays size={18}/><span>Appointments</span></NavLink>
        {[Role.Admin, Role.Receptionist].includes(user.role) && <NavLink to="/doctors" className={linkClass}><Stethoscope size={18}/><span>Doctors</span></NavLink>}
        {user.role !== Role.Billing && <NavLink to="/patients" className={linkClass}><Users size={18}/><span>Patients</span></NavLink>}
        {[Role.Admin, Role.Receptionist].includes(user.role) && <NavLink to="/notifications" className={linkClass}><Mail size={18}/><span>Notifications</span></NavLink>}
        {[Role.Admin, Role.Billing].includes(user.role) && <NavLink to="/finances" className={linkClass}><DollarSign size={18}/><span>Finances</span></NavLink>}
        {user.role === Role.Admin && <NavLink to="/settings" className={linkClass}><SettingsIcon size={18}/><span>Settings</span></NavLink>}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center space-x-3 text-teal-200 hover:text-white w-full px-2 py-2 transition-colors">
          <LogOut size={18}/><span>Logout</span>
        </button>
      </div>
    </div>
  );
};
export default Sidebar;