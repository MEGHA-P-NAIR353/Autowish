import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { GlassButton } from '../ui';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[360px] flex items-center justify-center p-6">
          <div className="w-full max-w-md p-6 rounded-2xl bg-raised/70 border border-line-soft backdrop-blur-xl text-center shadow-xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">Something went wrong</h2>
              <p className="text-xs text-slate-400 mt-1">
                {this.state.error?.message || 'An unexpected error occurred while loading this view.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <GlassButton
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw size={14} />}
              >
                Reload
              </GlassButton>
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/dashboard';
                }}
                leftIcon={<Home size={14} />}
              >
                Dashboard
              </GlassButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
