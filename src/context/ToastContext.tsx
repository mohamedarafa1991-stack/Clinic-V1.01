import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType; }
const ToastContext = createContext({ showToast: (m: string, t?: ToastType) => {} });
export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center p-4 rounded shadow-lg text-white min-w-[300px] animate-fade-in-up ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
            <div className="mr-3">
              {t.type === 'success' ? <CheckCircle size={20}/> : t.type === 'error' ? <AlertCircle size={20}/> : <Info size={20}/>}
            </div>
            <div className="flex-1 text-sm font-medium">{t.message}</div>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="ml-4 opacity-70"><X size={16}/></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};