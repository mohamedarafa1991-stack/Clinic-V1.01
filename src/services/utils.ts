import { AppointmentStatus, NotificationLog } from "../types";
import { saveNotification } from "./db";
import { saveFileToDisk } from "./storage";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const hashPassword = (p: string) => btoa(p.split('').reverse().join('')); 
export const formatCurrency = (n: number) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(n);

/**
 * Global Printing Utility
 */
export const printElement = (title: string) => {
  const originalTitle = document.title;
  document.title = title;
  window.print();
  document.title = originalTitle;
};

export const exportToCSV = (filename: string, rows: any[]) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','), 
    ...rows.map(r => keys.map(k => {
      const cell = r[k] === null || r[k] === undefined ? '' : r[k];
      return JSON.stringify(cell);
    }).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  link.click();
};

export const exportToExcel = (filename: string, rows: any[]) => {
  if (!rows.length) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  const name = filename.endsWith('.xlsx') ? filename : filename + '.xlsx';
  XLSX.writeFile(workbook, name);
};

export const exportToPDF = (filename: string, title: string, rows: any[]) => {
    if (!rows.length) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(15, 118, 110);
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    if (rows.length > 0) {
      const head = [Object.keys(rows[0])];
      const body = rows.map(r => Object.values(r));

      autoTable(doc, {
          head: head,
          body: body,
          startY: 35,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [15, 118, 110] }
      });
    }
    
    const name = filename.endsWith('.pdf') ? filename : filename + '.pdf';
    doc.save(name);
};

export const sendEmail = (recipient: string, subject: string, body: string, type: 'Auto' | 'Manual' = 'Manual') => {
  console.log(`%c [MAILER] To ${recipient}: ${subject}`, 'color: cyan; font-weight: bold;');
  const log: NotificationLog = {
    id: generateId(),
    date: new Date().toISOString(),
    recipientEmail: recipient,
    subject,
    message: body,
    type
  };
  saveNotification(log);
  return true; 
};

export const fileToBase64 = async (file: File): Promise<string> => {
  return await saveFileToDisk(file);
};

const FSM: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.Scheduled]: [AppointmentStatus.CheckedIn, AppointmentStatus.Cancelled],
  [AppointmentStatus.CheckedIn]: [AppointmentStatus.InProgress, AppointmentStatus.Scheduled, AppointmentStatus.Cancelled],
  [AppointmentStatus.InProgress]: [AppointmentStatus.Completed, AppointmentStatus.CheckedIn],
  [AppointmentStatus.Completed]: [AppointmentStatus.InProgress],
  [AppointmentStatus.Cancelled]: [AppointmentStatus.Scheduled]
};

export const getValidTransitions = (s: AppointmentStatus) => FSM[s] || [];
export const isValidTransition = (f: AppointmentStatus, t: AppointmentStatus) => f === t || (FSM[f]?.includes(t) ?? false);
