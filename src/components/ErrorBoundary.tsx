import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    color: '#EF4444',
                    backgroundColor: '#1e293b',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong</h1>
                    <pre style={{
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        padding: '1rem',
                        borderRadius: '8px',
                        overflow: 'auto',
                        maxWidth: '90vw'
                    }}>
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
