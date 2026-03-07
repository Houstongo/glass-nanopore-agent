import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from 'antd';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    background: '#FFF1F2',
                    borderRadius: '24px',
                    margin: '24px',
                    border: '1px solid #FECACA',
                    textAlign: 'center'
                }}>
                    <AlertCircle size={48} color="#DC2626" style={{ marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#991B1B', margin: '0 0 8px 0' }}>组件渲染异常</h2>
                    <p style={{ color: '#B91C1C', fontSize: '14px', maxWidth: '400px', marginBottom: '24px' }}>
                        检测到内部错误，可能是由于硬件通讯协议变更或数据格式不兼容导致。
                    </p>
                    <Button
                        type="primary"
                        danger
                        icon={<RefreshCw size={16} />}
                        onClick={() => window.location.reload()}
                        style={{ borderRadius: '10px', height: '40px', fontWeight: 700 }}
                    >
                        重载应用
                    </Button>
                    <pre style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: '#fff',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#7F1D1D',
                        textAlign: 'left',
                        maxWidth: '100%',
                        overflow: 'auto',
                        border: '1px solid #FEE2E2'
                    }}>
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
