/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Prevents the entire app from crashing due to a single component error.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={{
          padding: '24px',
          margin: '16px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-text)' }}>
            Something went wrong
          </h2>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'var(--color-text-muted)', 
            marginBottom: '16px',
            maxWidth: '400px',
            margin: '0 auto 16px',
          }}>
            An error occurred while rendering this component. 
            Please try again or refresh the page.
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <details style={{ 
              textAlign: 'left', 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>
                Error Details (Dev Only)
              </summary>
              <pre style={{ 
                overflow: 'auto', 
                whiteSpace: 'pre-wrap',
                color: '#ef4444',
                margin: 0,
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleRetry}
            className="btn btn-primary"
            style={{ marginRight: '8px' }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for functional components
 */
interface WithErrorBoundaryProps {
  children: ReactNode;
  name?: string;
}

export function WithErrorBoundary({ children, name }: WithErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      onError={(error) => {
        // Could send to error tracking service here
        if (import.meta.env.DEV) {
          console.error(`Error in ${name || 'component'}:`, error);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
