import React, { useEffect, useState, useMemo } from 'react';
import { getAppointments, getDoctors, getPatients } from '../services/db';
import { Appointment, Doctor, Patient } from '../types';
import { exportToCSV, exportToExcel, exportToPDF, formatCurrency } from '../services/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, DollarSign, Calendar, PieChart as PieIcon, BarChart3, Users, Stethoscope, Table, FileSpreadsheet, FileText } from 'lucide-react';
import { isWithinInterval, parseISO, startOfDay, endOfDay, subDays, format } from 'date-fns';

type Period = 'today' | '7d' | '30d' | 'all' | 'custom';
type BreakdownView = 'doctors' | 'specialties';

const Finances: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  const [period, setPeriod] = useState<Period>('30d');
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('doctors');
  const [customRange, setCustomRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    setAppointments(getAppointments());
    setDoctors(getDoctors());
    setPatients(getPatients());
  }, []);

  const filteredApps = useMemo(() => {
    if (period === 'all') return appointments;

    let start = startOfDay(new Date());
    let end = endOfDay(new Date());

    if (period === 'today') {
      start = startOfDay(new Date());
      end = endOfDay(new Date());
    } else if (period === '7d') {
      start = startOfDay(subDays(new Date(), 7));
    } else if (period === '30d') {
      start = startOfDay(subDays(new Date(), 30));
    } else if (period === 'custom') {
      start = startOfDay(parseISO(customRange.start));
      end = endOfDay(parseISO(customRange.end));
    }

    return appointments.filter(a => {
      try {
        const appDate = parseISO(a.date);
        return isWithinInterval(appDate, { start, end });
      } catch (e) {
        return false;
      }
    });
  }, [appointments, period, customRange]);

  const analytics = useMemo(() => {
    const months: Record<string, number> = {};
    const docMap: Record<string, number> = {};
    const specialtyMap: Record<string, number> = {};

    // For Detailed Breakdown
    const detailedDocs: Record<string, { name: string, count: number, billed: number, paid: number, pending: number, specialty: string }> = {};
    const detailedSpecs: Record<string, { name: string, count: number, billed: number, paid: number, pending: number }> = {};

    filteredApps.forEach(a => {
      const paid = a.amountPaid || 0;
      const fee = a.totalFee || 0;
      const pending = Math.max(0, fee - paid);
      
      // Basic Charts Data
      if (paid > 0) {
        const monthKey = a.date.substring(0, 7);
        months[monthKey] = (months[monthKey] || 0) + paid;
      }

      const doc = doctors.find(d => d.id === a.doctorId);
      const docName = doc?.name || 'Unknown';
      const specName = doc?.specialty || 'General';

      // Chart Data Aggregation
      docMap[docName] = (docMap[docName] || 0) + paid;
      specialtyMap[specName] = (specialtyMap[specName] || 0) + paid;

      // Detailed Doctor Stats
      if (!detailedDocs[docName]) detailedDocs[docName] = { name: docName, count: 0, billed: 0, paid: 0, pending: 0, specialty: specName };
      detailedDocs[docName].count += 1;
      detailedDocs[docName].billed += fee;
      detailedDocs[docName].paid += paid;
      detailedDocs[docName].pending += pending;

      // Detailed Specialty Stats
      if (!detailedSpecs[specName]) detailedSpecs[specName] = { name: specName, count: 0, billed: 0, paid: 0, pending: 0 };
      detailedSpecs[specName].count += 1;
      detailedSpecs[specName].billed += fee;
      detailedSpecs[specName].paid += paid;
      detailedSpecs[specName].pending += pending;
    });

    return {
      monthly: Object.entries(months).map(([name, amount]) => ({ name, amount })).sort((a,b) => a.name.localeCompare(b.name)),
      doctorsChart: Object.entries(docMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      specialtiesChart: Object.entries(specialtyMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      detailedDocs: Object.values(detailedDocs).sort((a,b) => b.paid - a.paid),
      detailedSpecs: Object.values(detailedSpecs).sort((a,b) => b.paid - a.paid)
    };
  }, [filteredApps, doctors]);

  const totalRevenue = filteredApps.reduce((sum, a) => sum + (a.amountPaid || 0), 0);
  const pendingRevenue = filteredApps
    .filter(a => a.status !== 'Cancelled')
    .reduce((sum, a) => sum + Math.max(0, (a.totalFee || 0) - (a.amountPaid || 0)), 0);

  const getExportData = (source: any[]) => {
    return source.map(app => {
        const doc = doctors.find(d => d.id === app.doctorId);
        const pat = patients.find(p => p.id === app.patientId);
        return {
          "Date": app.date,
          "Time": app.time,
          "Doctor": doc?.name || "Unknown",
          "Specialty": doc?.specialty || "N/A",
          "Patient": pat?.name || "Unknown",
          "Type": app.type,
          "Billed": app.totalFee,
          "Paid": app.amountPaid,
          "Status": app.status
        };
      });
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf', dataset: 'raw' | 'breakdown') => {
    const ts = new Date().toISOString().split('T')[0];
    const filename = dataset === 'raw' ? `Financial_Raw_${period}_${ts}` : `Financial_Breakdown_${breakdownView}_${period}_${ts}`;
    
    let data;
    let title;

    if (dataset === 'raw') {
        data = getExportData(filteredApps);
        title = `Financial Report (${period})`;
    } else {
        data = breakdownView === 'doctors' ? analytics.detailedDocs : analytics.detailedSpecs;
        title = `Revenue Breakdown by ${breakdownView === 'doctors' ? 'Doctor' : 'Specialty'} (${period})`;
    }

    if (!data.length) { alert('No data to export'); return; }

    if (type === 'csv') exportToCSV(filename + '.csv', data);
    if (type === 'excel') exportToExcel(filename + '.xlsx', data);
    if (type === 'pdf') exportToPDF(filename + '.pdf', title, data);
  };

  const CHART_COLORS = ['#0f766e', '#0d9488', '#14b8a6', '#5eead4', '#99f6e4', '#2dd4bf', '#042f2e'];

  const periodButton = (id: Period, label: string) => (
    <button
      onClick={() => setPeriod(id)}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
        period === id 
        ? 'bg-primary text-white border-primary shadow-lg scale-105' 
        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  const ExportMenu = ({ dataset }: { dataset: 'raw' | 'breakdown' }) => (
    <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
        <button onClick={() => handleExport('csv', dataset)} className="p-2 hover:bg-gray-50 text-gray-600 rounded" title="Export CSV"><Table size={16}/></button>
        <button onClick={() => handleExport('excel', dataset)} className="p-2 hover:bg-gray-50 text-green-600 rounded" title="Export Excel"><FileSpreadsheet size={16}/></button>
        <button onClick={() => handleExport('pdf', dataset)} className="p-2 hover:bg-gray-50 text-red-600 rounded" title="Export PDF"><FileText size={16}/></button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Revenue Intelligence</h2>
          <p className="text-gray-500 font-medium">Monitoring clinic collection performance and clinical partitioning</p>
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Export Master Data:</span>
            <ExportMenu dataset="raw" />
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center px-4 border-r border-gray-100 mr-2 text-gray-400">
           <Calendar size={18} className="mr-2"/>
           <span className="text-xs font-black uppercase tracking-widest">Temporal Analysis</span>
        </div>
        {periodButton('today', 'Today')}
        {periodButton('7d', '7 Days')}
        {periodButton('30d', '30 Days')}
        {periodButton('all', 'All Time')}
        {periodButton('custom', 'Custom Range')}

        {period === 'custom' && (
          <div className="flex items-center space-x-2 ml-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
            <input 
              type="date" 
              className="bg-transparent text-xs font-bold outline-none text-gray-700" 
              value={customRange.start} 
              onChange={e => setCustomRange({...customRange, start: e.target.value})}
            />
            <span className="text-gray-300 font-bold">→</span>
            <input 
              type="date" 
              className="bg-transparent text-xs font-bold outline-none text-gray-700" 
              value={customRange.end} 
              onChange={e => setCustomRange({...customRange, end: e.target.value})}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-emerald-500/5 border border-emerald-50 flex items-center justify-between">
           <div>
             <p className="text-emerald-600/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Collections</p>
             <h3 className="text-4xl font-black text-emerald-600">{formatCurrency(totalRevenue)}</h3>
           </div>
           <div className="p-6 bg-emerald-50 rounded-3xl text-emerald-600">
             <DollarSign size={40} />
           </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-amber-500/5 border border-amber-50 flex items-center justify-between">
           <div>
             <p className="text-amber-600/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Outstanding Balance</p>
             <h3 className="text-4xl font-black text-amber-600">{formatCurrency(pendingRevenue)}</h3>
           </div>
           <div className="p-6 bg-amber-50 rounded-3xl text-amber-600">
             <TrendingUp size={40} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-[400px]">
          <div className="mb-4">
             <h3 className="text-lg font-black text-gray-800 flex items-center">
               <PieIcon size={20} className="mr-2 text-primary" /> Revenue by Specialty
             </h3>
          </div>
          <div className="flex-1">
             {analytics.specialtiesChart.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.specialtiesChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.specialtiesChart.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400 italic font-medium bg-gray-50 rounded-3xl">No data available</div>
             )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-[400px]">
          <div className="mb-4">
             <h3 className="text-lg font-black text-gray-800 flex items-center">
               <BarChart3 size={20} className="mr-2 text-primary" /> Billing by Clinician
             </h3>
          </div>
          <div className="flex-1">
             {analytics.doctorsChart.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.doctorsChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 8, 8, 0]} barSize={20} />
                </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-400 italic font-medium bg-gray-50 rounded-3xl">No staff data available</div>
             )}
          </div>
        </div>
      </div>

      {/* DETAILED LEDGER SECTION */}
      <div className="bg-white rounded-[32px] shadow-lg border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
           <div>
             <h3 className="text-xl font-black text-gray-800">Detailed Financial Ledger</h3>
             <p className="text-gray-500 text-sm">Itemized breakdown by department or individual personnel</p>
           </div>
           
           <div className="flex bg-white p-1 rounded-xl border shadow-sm">
              <button 
                onClick={() => setBreakdownView('doctors')}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${breakdownView === 'doctors' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                By Doctor
              </button>
              <button 
                onClick={() => setBreakdownView('specialties')}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${breakdownView === 'specialties' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                By Specialty
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100/50 text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
              <tr>
                <th className="p-6 pl-8">Name / Department</th>
                <th className="p-6 text-center">Patient Vol.</th>
                <th className="p-6 text-right text-gray-500">Total Invoiced</th>
                <th className="p-6 text-right text-emerald-600">Collected</th>
                <th className="p-6 text-right text-amber-600 pr-8">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(breakdownView === 'doctors' ? analytics.detailedDocs : analytics.detailedSpecs).map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition group">
                  <td className="p-6 pl-8">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-4 ${breakdownView === 'doctors' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {breakdownView === 'doctors' ? <Stethoscope size={18}/> : <Users size={18}/>}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{item.name}</div>
                        {breakdownView === 'doctors' && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{(item as any).specialty}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{item.count}</span>
                  </td>
                  <td className="p-6 text-right font-mono text-sm font-bold text-gray-500">
                    {formatCurrency(item.billed)}
                  </td>
                  <td className="p-6 text-right font-mono text-sm font-black text-emerald-600 bg-emerald-50/10 group-hover:bg-emerald-50/30 transition-colors">
                    {formatCurrency(item.paid)}
                  </td>
                  <td className="p-6 pr-8 text-right font-mono text-sm font-bold text-amber-600 bg-amber-50/10 group-hover:bg-amber-50/30 transition-colors">
                    {item.pending > 0 ? formatCurrency(item.pending) : '-'}
                  </td>
                </tr>
              ))}
              {(breakdownView === 'doctors' ? analytics.detailedDocs : analytics.detailedSpecs).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 font-medium italic">No financial activity recorded for this period.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
               <tr>
                 <td colSpan={5} className="p-4">
                    <div className="flex justify-center items-center space-x-2">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Download Report:</span>
                       <ExportMenu dataset="breakdown" />
                    </div>
                 </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Finances;