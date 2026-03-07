import { useState, useCallback } from 'react';

const useLinkLogger = (maxLogs = 200) => {
    const [logs, setLogs] = useState([]);

    const addEventLog = useCallback((message, type = 'INFO', source = 'SYS') => {
        const newLog = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            message,
            type, // INFO, WARN, ERROR, DEBUG
            source
        };
        setLogs(prev => [newLog, ...prev].slice(0, maxLogs));
    }, [maxLogs]);

    const ingestHardwareLogs = useCallback((rawLogs) => {
        if (!rawLogs || rawLogs.length === 0) return;
        setLogs(prev => {
            const newLogs = rawLogs.map(msg => ({
                id: Date.now() + Math.random(),
                timestamp: new Date().toLocaleTimeString(),
                message: msg,
                type: 'DEBUG',
                source: 'MCU'
            })).reverse();
            return [...newLogs, ...prev].slice(0, maxLogs);
        });
    }, [maxLogs]);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return { logs, addEventLog, ingestHardwareLogs, clearLogs };
};

export default useLinkLogger;
