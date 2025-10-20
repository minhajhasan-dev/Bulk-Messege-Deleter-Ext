import React from 'react';

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Could log to monitoring here in real app
  }

  handleReset() {
    this.setState({ hasError: false, error: undefined });
  }

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="p-4 text-sm">
          <div className="font-semibold text-red-600">Something went wrong</div>
          <div className="mt-1 text-xs text-gray-600">{error?.message || 'Unknown error'}</div>
          <button type="button" onClick={this.handleReset} className="mt-2 px-2 py-1 border rounded">
            Try again
          </button>
        </div>
      );
    }

    return children as React.ReactElement;
  }
}

export default ErrorBoundary;
