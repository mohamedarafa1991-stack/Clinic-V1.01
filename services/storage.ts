/**
 * Commercial File System Simulation
 * In a real Electron app, this would use 'fs' module to write to the hard drive.
 * Here, we separate heavy files from the SQLite DB to prevent bloating the relational data.
 */

const STORAGE_PREFIX = 'medicore_fs_';

export const saveFileToDisk = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1.5MB Limit for images to prevent immediate storage crash
    if (file.size > 1500000) {
      reject(new Error("File too large. Max 1.5MB allowed in browser mode."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const fileId = Math.random().toString(36).substr(2, 12);
      const path = `file://${fileId}.${file.name.split('.').pop()}`;
      
      try {
        localStorage.setItem(STORAGE_PREFIX + path, base64);
        resolve(path);
      } catch (e) {
        reject(new Error("Disk storage full"));
      }
    };
    reader.onerror = reject;
  });
};

export const getFileFromDisk = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  
  // Legacy support for old Base64 strings stored directly in DB
  if (path.startsWith('data:')) return path;

  // Retrieve from "Disk"
  const fileData = localStorage.getItem(STORAGE_PREFIX + path);
  return fileData || undefined;
};

export const deleteFileFromDisk = (path: string) => {
  if (path && path.startsWith('file://')) {
    localStorage.removeItem(STORAGE_PREFIX + path);
  }
};