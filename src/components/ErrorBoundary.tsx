import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  storageKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry by design — log to console only.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSettings = () => {
    try {
      localStorage.removeItem(this.props.storageKey ?? 'psx-converter-storage');
      sessionStorage.removeItem('psx-history');
    } catch (e) {
      console.error('Could not clear storage:', e);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. Your image and settings are stored locally — try
              reloading. If it keeps crashing, reset settings.
            </p>
          </div>

          <pre className="text-[11px] font-mono bg-muted/50 rounded p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
            {this.state.error.message}
          </pre>

          <div className="flex gap-2">
            <button
              onClick={this.handleReload}
              className="flex-1 h-9 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={this.handleResetSettings}
              className="flex-1 h-9 rounded border border-border text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              Reset settings
            </button>
          </div>

          <a
            href="https://github.com/AmaruSegovia/psx-converter/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Report this issue ↗
          </a>
        </div>
      </div>
    );
  }
}
