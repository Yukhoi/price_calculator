import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';


class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', border: '1px solid red', borderRadius: '4px', margin: '1rem' }}>
          <h2>出现错误</h2>
          <p>组件渲染时发生错误。请检查控制台获取详细信息。</p>
          <button onClick={() => this.setState({ hasError: false, error: undefined })}>
            重试
          </button>
          {this.state.error && (
            <pre style={{ marginTop: '1rem', backgroundColor: '#f5f5f5', padding: '1rem' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;