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
import { Role } from './types';

const ProtectedLayout: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

// Guard component for roles
const RoleRoute: React.FC<{ allowed: Role[], children: React.ReactNode }> = ({ allowed, children }) => {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/patients" element={<Patients />} />
        
        {/* Admin & Receptionist only */}
        <Route path="/doctors" element={
          <RoleRoute allowed={[Role.Admin, Role.Receptionist]}>
            <Doctors />
          </RoleRoute>
        } />

        <Route path="/notifications" element={
          <RoleRoute allowed={[Role.Admin, Role.Receptionist]}>
            <Notifications />
          </RoleRoute>
        } />
        
        {/* Admin only */}
        <Route path="/finances" element={
          <RoleRoute allowed={[Role.Admin]}>
            <Finances />
          </RoleRoute>
        } />
        
        <Route path="/settings" element={
          <RoleRoute allowed={[Role.Admin]}>
            <Settings />
          </RoleRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;