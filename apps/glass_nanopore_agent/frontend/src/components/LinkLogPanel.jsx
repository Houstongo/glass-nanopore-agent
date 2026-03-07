import React from 'react';

const LinkLogPanel = ({ logs, emptyText = "等待链路数据..." }) => {
    if (!logs || logs.length === 0) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                {emptyText}
            </div>
        );
    }

    return (
        <div className="custom-scroll" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
            {logs.map(log => (
                <div key={log.id} style={{
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(0,0,0,0.03)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    display: 'flex',
                    gap: '10px'
                }}>
                    <span style={{ color: 'var(--text-dim)', minWidth: '65px' }}>[{log.timestamp}]</span>
                    <span style={{
                        color: log.type === 'WARN' ? '#F59E0B' : log.type === 'ERROR' ? '#EF4444' : log.source === 'MCU' ? '#6366F1' : 'var(--text-main)',
                        fontWeight: log.source === 'MCU' ? 700 : 400
                    }}>
                        {log.message}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default LinkLogPanel;
