import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error', { error, errorInfo }, 'ErrorBoundary');
    this.setState({ errorInfo });

    // You can log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] p-4 transition-colors duration-300" dir="rtl">
          <div className="max-w-md w-full">
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                אופס! משהו השתבש
              </h1>

              <p className="text-[var(--color-text-secondary)] mb-6">
                אירעה שגיאה בלתי צפויה. אנחנו מצטערים על אי הנוחות.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-right">
                  <p className="text-sm font-mono text-red-400 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]">
                        פרטי Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-[var(--color-text-muted)] overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 btn-primary px-6 py-3 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>נסה שוב</span>
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex-1 btn-secondary px-6 py-3 flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span>חזרה לדף הבית</span>
                </button>
              </div>

              <button
                onClick={this.handleReload}
                className="mt-4 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                רענן את הדף
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
