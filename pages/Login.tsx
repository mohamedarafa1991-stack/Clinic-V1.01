import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { getSettings } from '../services/db';
import { hashPassword } from '../services/utils';
import { getFileFromDisk } from '../services/storage';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const settings = getSettings();
  const logoSrc = getFileFromDisk(settings.logo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, hashPassword(password))) {
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-primary">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 flex items-center justify-center text-primary bg-gray-50 rounded-full border border-gray-100 p-2 overflow-hidden">
             {logoSrc ? (
               <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
             ) : (
               <Activity size={40} />
             )}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">{settings.clinicName}</h2>
        <p className="text-center text-gray-500 mb-6">Clinic Management System</p>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <input 
              type="text" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Admin"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white text-gray-900 border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded hover:bg-secondary transition duration-200">
            Secure Login
          </button>
        </form>
        
        <div className="mt-6 text-xs text-gray-500 text-center bg-gray-50 p-4 rounded border border-gray-200">
          <p className="font-semibold mb-2 text-gray-700">Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-left mx-auto max-w-[200px]">
             <span>Admin:</span> <span className="font-mono">admin123</span>
             <span>Reception:</span> <span className="font-mono">user123</span>
             <span>Doctor:</span> <span className="font-mono">doc123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;