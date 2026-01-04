import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeDB } from './services/db';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);

initializeDB()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch(err => {
    console.error("DB Init Error:", err);
    root.render(
      <div className="p-10 text-red-600 font-sans">
        <h1 className="text-2xl font-bold mb-4">Fatal Startup Error</h1>
        <p className="mb-4">The clinic database could not be initialized.</p>
        <pre className="bg-gray-100 p-4 rounded text-xs">{err.message}</pre>
        <button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
          Retry Launch
        </button>
      </div>
    );
  });