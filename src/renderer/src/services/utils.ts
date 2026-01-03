import { NotificationLog } from "../types";
import { saveNotification } from "./db";

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Simple obfuscation (In a real app, use bcrypt on backend)
export const hashPassword = (input: string): string => {
  // Simple Base64 + Reverse to prevent plain text reading in database
  return btoa(input.split('').reverse().join('')); 
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
};

export const exportToCSV = (filename: string, rows: any[]) => {
  if (!rows || !rows.length) {
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date
          ? cell.toLocaleString()
          : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Simulate Sending Email
export const sendEmail = (recipient: string, subject: string, body: string, type: 'Auto' | 'Manual' = 'Manual') => {
  console.log(`%c Sending Email to ${recipient}: ${subject}`, 'color: cyan; font-weight: bold;');
  
  const log: NotificationLog = {
    id: generateId(),
    date: new Date().toISOString(),
    recipientEmail: recipient,
    subject: subject,
    message: body,
    type: type
  };
  
  saveNotification(log);
  return true; 
};

// File helper
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Basic size validation (limit to 1.5MB to avoid localStorage quota issues)
    if (file.size > 1500000) {
      reject(new Error("File is too large (Max 1.5MB)"));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};