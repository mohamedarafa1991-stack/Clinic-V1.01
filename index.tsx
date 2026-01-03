import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeDB } from './services/db';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Initialize SQLite Database before rendering
initializeDB().then(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(err => {
  console.error("Failed to initialize database:", err);
  root.render(
    <div className="p-10 text-red-600 font-sans">
      <h1 className="text-2xl font-bold mb-4">Fatal Error: Clinic System Failed to Start</h1>
      <p className="mb-4">Database initialization failed. This usually happens due to:</p>
      <ul className="list-disc list-inside mb-4 space-y-1 text-sm text-gray-700">
        <li>Missing <b>sql-wasm.js</b> library (Check internet connection)</li>
        <li>Browser storage quota exceeded</li>
        <li>Outdated browser incompatible with WebAssembly</li>
      </ul>
      <div className="bg-gray-100 p-4 rounded border border-gray-300 font-mono text-xs overflow-auto max-h-32 mb-4">
        {err.message || JSON.stringify(err)}
      </div>
      <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
        Reload Application
      </button>
    </div>
  );
});