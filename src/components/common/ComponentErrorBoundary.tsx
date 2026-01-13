import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center" dir="rtl">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            שגיאה בטעינת {this.props.componentName || 'הרכיב'}
          </h3>

          <p className="text-sm text-zinc-400 mb-4">
            משהו השתבש. נסה לרענן או חזור אחורה.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <p className="text-xs font-mono text-red-400 mb-4 break-all bg-red-500/5 p-2 rounded-lg">
              {this.state.error.message}
            </p>
          )}

          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-2 mx-auto transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>נסה שוב</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ComponentErrorBoundary componentName={componentName}>
        <WrappedComponent {...props} />
      </ComponentErrorBoundary>
    );
  };
}
