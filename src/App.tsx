import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Finances from './pages/Finances';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { Role } from './types';
import { ShieldAlert } from 'lucide-react';

// --- Guards & Layouts ---

const ProtectedLayout: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="no-print hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 ml-0 lg:ml-64 p-4 lg:p-8 overflow-y-auto no-scrollbar">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};

const RoleGuard: React.FC<{ allowed: Role[], children: React.ReactNode }> = ({ allowed, children }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (!allowed.includes(user.role)) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md text-center border-t-4 border-red-500">
          <div className="inline-flex p-4 bg-red-50 rounded-full text-red-500 mb-6">
            <ShieldAlert size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You do not have the required permissions to access this administrative section.</p>
          <button 
            onClick={() => window.history.back()} 
            className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-secondary transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// --- Main App Component ---

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Dashboard />} />
                
                <Route path="/appointments" element={<Appointments />} />
                
                <Route path="/patients" element={
                  <RoleGuard allowed={[Role.Admin, Role.Receptionist, Role.Doctor, Role.Nurse]}>
                    <Patients />
                  </RoleGuard>
                } />
                
                <Route path="/doctors" element={
                  <RoleGuard allowed={[Role.Admin, Role.Receptionist]}>
                    <Doctors />
                  </RoleGuard>
                } />

                <Route path="/notifications" element={
                  <RoleGuard allowed={[Role.Admin, Role.Receptionist]}>
                    <Notifications />
                  </RoleGuard>
                } />
                
                <Route path="/finances" element={
                  <RoleGuard allowed={[Role.Admin, Role.Billing]}>
                    <Finances />
                  </RoleGuard>
                } />
                
                <Route path="/settings" element={
                  <RoleGuard allowed={[Role.Admin]}>
                    <Settings />
                  </RoleGuard>
                } />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;