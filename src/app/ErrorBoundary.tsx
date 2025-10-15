import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string; stack?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: (err as any)?.message ?? String(err) };
  }

  componentDidCatch(err: any, info: any) {
    console.error('[ErrorBoundary] caught', err, info);
    this.setState({ stack: info?.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 16 }}>
        <h2>Something went wrong.</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.message}</pre>
        {this.state.stack ? (
          <details>
            <summary>Component stack</summary>
            <pre>{this.state.stack}</pre>
          </details>
        ) : null}
      </div>
    );
  }
}
