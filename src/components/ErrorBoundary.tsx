import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Fixed: Using class property initialization and explicit generics to ensure 'this.state' and 'this.props' are correctly typed and recognized by the compiler.
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // Fixed: state property is correctly recognized via generics in Component<Props, State>
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg text-center border-t-4 border-red-500">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle size={48} className="text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">The application encountered an unexpected error.</p>
            <div className="bg-gray-100 p-4 rounded text-left text-xs font-mono text-red-600 overflow-auto max-h-32 mb-6">
               {this.state.error?.message}
            </div>
            <button
              className="bg-primary text-white px-6 py-2 rounded hover:bg-secondary transition"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    // Fixed: props property is correctly recognized via generics in Component<Props, State>
    return this.props.children;
  }
}

export default ErrorBoundary;