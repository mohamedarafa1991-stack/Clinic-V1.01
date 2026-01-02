import React, { useEffect, useState } from 'react';
import { getAppointments, getDoctors, getPatients } from '../services/db';
import { Appointment, Doctor } from '../types';
import { exportToCSV, formatCurrency } from '../services/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, DollarSign } from 'lucide-react';

const Finances: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthlyRev, setMonthlyRev] = useState<any[]>([]);
  const [docPerformance, setDocPerformance] = useState<any[]>([]);

  useEffect(() => {
    const apps = getAppointments();
    setAppointments(apps);
    calculateStats(apps, getDoctors());
  }, []);

  const calculateStats = (apps: Appointment[], docs: Doctor[]) => {
    // Monthly Revenue
    const months: Record<string, number> = {};
    apps.forEach(a => {
      if (a.isPaid) {
        const key = a.date.substring(0, 7); // YYYY-MM
        months[key] = (months[key] || 0) + (a.feeSnapshot || 0);
      }
    });
    const monthlyData = Object.keys(months).map(k => ({ name: k, amount: months[k] })).sort((a,b) => a.name.localeCompare(b.name));
    setMonthlyRev(monthlyData);

    // Doctor Performance
    const docStats = docs.map(d => {
      const total = apps.filter(a => a.doctorId === d.id && a.isPaid).reduce((sum, a) => sum + (a.feeSnapshot || 0), 0);
      return { name: d.name, value: total };
    });
    setDocPerformance(docStats);
  };

  const totalRevenue = appointments.filter(a => a.isPaid).reduce((sum, a) => sum + (a.feeSnapshot || 0), 0);
  const pendingRevenue = appointments.filter(a => !a.isPaid && a.status !== 'Cancelled').reduce((sum, a) => sum + (a.feeSnapshot || 0), 0);

  const handleExport = (type: 'docs' | 'pats' | 'apps' | 'fin') => {
    const ts = new Date().toISOString().split('T')[0];
    if (type === 'docs') exportToCSV(`doctors_${ts}.csv`, getDoctors());
    if (type === 'pats') exportToCSV(`patients_${ts}.csv`, getPatients());
    if (type === 'apps') exportToCSV(`appointments_${ts}.csv`, getAppointments());
    if (type === 'fin') exportToCSV(`financials_${ts}.csv`, monthlyRev);
  };

  const COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#5eead4', '#99f6e4'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Financial Dashboard</h2>
         <div className="flex space-x-2">
           <button onClick={() => handleExport('fin')} className="bg-primary text-white text-sm px-3 py-2 rounded flex items-center hover:bg-secondary">
             <Download size={16} className="mr-2" /> Export Report
           </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-gray-500 text-sm font-medium">Total Collected Revenue</p>
             <h3 className="text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</h3>
           </div>
           <div className="p-4 bg-emerald-100 rounded-full text-emerald-600">
             <DollarSign size={32} />
           </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
           <div>
             <p className="text-gray-500 text-sm font-medium">Pending Payments</p>
             <h3 className="text-3xl font-bold text-amber-600">{formatCurrency(pendingRevenue)}</h3>
           </div>
           <div className="p-4 bg-amber-100 rounded-full text-amber-600">
             <TrendingUp size={32} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRev}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doctor Performance Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue by Doctor</h3>
          <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={docPerformance}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {docPerformance.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Data Export Center</h3>
        <p className="text-sm text-gray-500 mb-4">Download your clinic data in CSV format for Excel/Sheets analysis.</p>
        <div className="flex flex-wrap gap-4">
           <button onClick={() => handleExport('docs')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center">
             <Download size={16} className="mr-2" /> Doctors List
           </button>
           <button onClick={() => handleExport('pats')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center">
             <Download size={16} className="mr-2" /> Patients List
           </button>
           <button onClick={() => handleExport('apps')} className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center">
             <Download size={16} className="mr-2" /> Appointments Records
           </button>
        </div>
      </div>
    </div>
  );
};

export default Finances;