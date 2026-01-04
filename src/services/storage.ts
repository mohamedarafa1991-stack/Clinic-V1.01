const FS_PREFIX = 'medicore_fs_';

export const saveFileToDisk = async (file: File): Promise<string> => {
  if (file.size > 1500000) throw new Error("File too large (Max 1.5MB)");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const id = Math.random().toString(36).substr(2, 12);
      const path = `file://${id}.${file.name.split('.').pop()}`;
      localStorage.setItem(FS_PREFIX + path, reader.result as string);
      resolve(path);
    };
    reader.onerror = reject;
  });
};

export const getFileFromDisk = (path?: string) => {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  return localStorage.getItem(FS_PREFIX + path) || undefined;
};