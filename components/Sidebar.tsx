import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Stethoscope, CalendarDays, DollarSign, Database, Activity, Mail, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { getSettings } from '../services/db';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const settings = getSettings();
  
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-6 py-3 transition-colors duration-200 ${
      isActive
        ? 'bg-secondary text-white border-r-4 border-white'
        : 'text-teal-100 hover:bg-teal-800 hover:text-white'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="w-64 bg-primary text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50 transition-colors duration-300">
      <div className="p-6 flex items-center space-x-3 border-b border-white/20">
        <Activity className="h-8 w-8 text-white" />
        <div>
          <h1 className="text-xl font-bold tracking-wide truncate max-w-[150px]">{settings.clinicName}</h1>
          <p className="text-xs text-teal-200">{user.role}</p>
        </div>
      </div>

      <nav className="flex-1 mt-6 overflow-y-auto">
        <NavLink to="/" className={linkClass}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink to="/appointments" className={linkClass}>
          <CalendarDays size={20} />
          <span>Appointments</span>
        </NavLink>
        
        {/* Only Admin and Receptionist can see all doctors management, Doctors see profile via separate logic or just limited */}
        {(user.role === Role.Admin || user.role === Role.Receptionist) && (
          <NavLink to="/doctors" className={linkClass}>
            <Stethoscope size={20} />
            <span>Doctors</span>
          </NavLink>
        )}

        <NavLink to="/patients" className={linkClass}>
          <Users size={20} />
          <span>Patients</span>
        </NavLink>

        {(user.role === Role.Admin || user.role === Role.Receptionist) && (
          <NavLink to="/notifications" className={linkClass}>
            <Mail size={20} />
            <span>Notifications</span>
          </NavLink>
        )}

        {user.role === Role.Admin && (
          <NavLink to="/finances" className={linkClass}>
            <DollarSign size={20} />
            <span>Finances</span>
          </NavLink>
        )}

        {user.role === Role.Admin && (
          <NavLink to="/settings" className={linkClass}>
            <SettingsIcon size={20} />
            <span>Settings</span>
          </NavLink>
        )}
      </nav>

      <div className="p-4 border-t border-white/20">
        <button onClick={handleLogout} className="flex items-center space-x-3 text-teal-100 hover:text-white w-full px-2 py-2">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
        <div className="text-xs text-teal-300 text-center mt-4">
          v2.0.0 &copy; {new Date().getFullYear()} MediCore
        </div>
      </div>
    </div>
  );
};

export default Sidebar;