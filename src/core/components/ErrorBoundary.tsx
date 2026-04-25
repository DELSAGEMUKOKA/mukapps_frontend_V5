import { Component, type ReactNode } from 'react';
import { TriangleAlert as AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50">
          <div className="text-center space-y-4 max-w-md p-8">
            <div className="flex justify-center">
              <div className="p-4 bg-error-100 rounded-full">
                <AlertTriangle size={32} className="text-error-600" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-secondary-900">Une erreur est survenue</h1>
            <p className="text-secondary-500 text-sm">{this.state.error?.message}</p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <RefreshCw size={14} />
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
