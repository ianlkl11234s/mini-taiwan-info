/**
 * ErrorBoundary — 隔離單一 panel 崩潰（特別是 Map WebGL fail）
 */

import { Component, type ReactNode } from "react";

interface Props {
  fallback?: (err: Error, reset: () => void) => ReactNode;
  label?: string;
  children: ReactNode;
}

interface State {
  err: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[${this.props.label ?? "panel"}] crashed:`, err, info.componentStack);
  }

  reset = () => this.setState({ err: null });

  render() {
    if (this.state.err) {
      if (this.props.fallback) return this.props.fallback(this.state.err, this.reset);
      return (
        <div style={{ padding: 20, color: "var(--danger)", fontSize: 13 }}>
          <strong>⚠️ {this.props.label ?? "面板"} 崩潰</strong>
          <div style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 12 }}>
            {this.state.err.message}
          </div>
          <button className="btn ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={this.reset}>
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
