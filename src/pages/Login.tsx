import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { hashPassword } from '../services/utils';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, hashPassword(pass))) navigate('/');
    else setErr('Invalid credentials');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-primary">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-primary/10 rounded-full text-primary"><Activity size={48}/></div>
        </div>
        <h2 className="text-3xl font-black text-center text-slate-800 mb-2">MediCore</h2>
        <p className="text-center text-slate-500 mb-8 font-medium">Clinic Management System</p>
        
        {err && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-100">{err}</div>}

        <form onSubmit={handle} className="space-y-6">
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Username</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-primary outline-none transition" required placeholder="Enter username"/>
          </div>
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-primary outline-none transition" required placeholder="••••••••"/>
          </div>
          <button className="w-full bg-primary text-white font-black py-4 rounded-xl hover:bg-secondary transition shadow-lg shadow-primary/30">Secure Sign In</button>
        </form>

        <div className="mt-8 pt-6 border-t text-[10px] text-slate-400 grid grid-cols-3 gap-2 text-center uppercase tracking-widest font-bold">
           <div>Admin<br/>admin123</div>
           <div>Staff<br/>user123</div>
           <div>Doctor<br/>doc123</div>
        </div>
      </div>
    </div>
  );
};
export default Login;