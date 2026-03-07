import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Terminal, Send, Activity, Settings2, RefreshCw, Zap, AlertOctagon, MoveUp, MoveDown, RotateCcw, RotateCw, Cpu, Gauge, Wifi, Pause, Play, Layers, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../constants/config';
import useLinkLogger from '../hooks/useLinkLogger';
import LinkLogPanel from '../components/LinkLogPanel';

const EtchingConsole = ({ llmModel }) => {
    // 1. 系统核心状态
    const [statusData, setStatusData] = useState({
        bridge: { is_connected: false, mode: 'Serial', port: '', state: { raw_log: [] } },
        sg: { is_connected: false, state: {} }
    });
    const [chartData, setChartData] = useState([]);
    const [messages, setMessages] = useState([{ role: 'assistant', content: '🚀 **刻蚀指挥系统已就绪**。我是您的 AI 实验官，已联调硬件底层。您可以尝试输入：“制备一个锥角为15°的纳米尖端”。' }]);

    // 2. 交互相关状态
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('agent');
    const [connectMode, setConnectMode] = useState('ws');
    const [gPort, setGPort] = useState('COM3');
    const [availablePorts, setAvailablePorts] = useState([]);
    const [wsIp, setWsIp] = useState(localStorage.getItem('labos_ws_ip') || '192.168.1.137:81');
    const [telemetryWsConnected, setTelemetryWsConnected] = useState(false);
    const { logs: monitorLogs, addEventLog, ingestHardwareLogs, clearLogs: clearLinkLogs } = useLinkLogger(120);

    // 3. 实验关键参数
    const [manualDepth, setManualDepth] = useState(600);
    const [manualTime, setManualTime] = useState(30);
    const [manualCounts, setManualCounts] = useState(12);
    const [sgMagnitude, setSgMagnitude] = useState(2.5);

    const taskStartTimeRef = useRef(null);
    const lastStateRef = useRef(0);
    const stickyConnectedUntilRef = useRef(0);
    const prevConnectedRef = useRef(null);
    const prevBridgeStateRef = useRef(null);

    const clearMonitorLogs = () => {
        clearLinkLogs();
        prevConnectedRef.current = null;
        prevBridgeStateRef.current = null;
        setStatusData(prev => ({
            ...prev,
            bridge: {
                ...prev.bridge,
                state: { ...prev.bridge.state, raw_log: [] }
            }
        }));
        axios.post(`${API_BASE}/etching/clear_log`).catch(() => { });
    };

    const applySnapshot = (snapshot) => {
        if (!snapshot || !snapshot.bridge || !snapshot.bridge.state) return;
        setStatusData(snapshot);
        const bridge = snapshot.bridge || {};
        const bridgeState = bridge.state || {};
        const backendConnected = Boolean(
            bridge.is_connected ||
            (bridgeState.bridge_internal_state &&
                bridgeState.bridge_internal_state !== 'DISCONNECTED' &&
                bridgeState.bridge_internal_state !== 'FAULT')
        );
        if (backendConnected) stickyConnectedUntilRef.current = Date.now() + 12000;

        const newState = snapshot.bridge.state;
        ingestHardwareLogs(newState.raw_log || []);
        const currentState = newState.sys_state;
        const previousState = lastStateRef.current;

        setChartData(prev => {
            if (previousState === 0 && currentState !== 0) {
                taskStartTimeRef.current = Date.now();
                return [];
            }
            if (currentState === 0 && prev.length > 0) return prev;
            let displayTime = taskStartTimeRef.current ? `${Math.floor((Date.now() - taskStartTimeRef.current) / 1000)}s` : "0s";
            const current_nA = (newState.adc_val / 4096) * 1000;
            let di_dt = 0;
            if (prev.length > 0) {
                const lastPoint = prev[prev.length - 1];
                di_dt = (current_nA - (lastPoint.raw_I || 0)).toFixed(3);
            }
            const next = [...prev, { time: displayTime, di_dt: Number(Math.abs(di_dt)), depth: Number(newState.pulse_cnt / 1000), raw_I: current_nA }];
            return next.slice(-200);
        });
        lastStateRef.current = currentState;
    };

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/etching/status`);
            applySnapshot(res.data);
        } catch (e) { }
    };

    useEffect(() => {
        let closedByUnmount = false;
        let reconnectTimer = null;
        let telemetryWs = null;

        const connectTelemetry = () => {
            const wsUrl = API_BASE.replace('http', 'ws') + '/ws/hardware/telemetry';
            telemetryWs = new WebSocket(wsUrl);
            telemetryWs.onopen = () => setTelemetryWsConnected(true);
            telemetryWs.onmessage = (event) => {
                try { applySnapshot(JSON.parse(event.data)); } catch { }
            };
            telemetryWs.onclose = () => {
                setTelemetryWsConnected(false);
                if (!closedByUnmount) reconnectTimer = setTimeout(connectTelemetry, 1500);
            };
        };

        connectTelemetry();
        const interval = setInterval(fetchStatus, 10000);
        axios.get(`${API_BASE}/system/ports`).then(res => setAvailablePorts(res.data.ports)).catch(() => { });
        return () => {
            closedByUnmount = true;
            clearInterval(interval);
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (telemetryWs) telemetryWs.close();
        };
    }, []);

    const handleHwAction = async (endpoint, data = {}) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (endpoint === 'connect_bridge') {
                const payload = connectMode === 'serial' ? { mode: "Serial", target: gPort } : { mode: "WebSocket", target: wsIp };
                if (connectMode === 'ws') localStorage.setItem('labos_ws_ip', wsIp);
                await axios.post(`${API_BASE}/etching/connect_bridge`, payload);
                stickyConnectedUntilRef.current = Date.now() + 12000;
            } else if (endpoint === 'disconnect_bridge') {
                await axios.post(`${API_BASE}/etching/disconnect_bridge`);
                stickyConnectedUntilRef.current = 0;
            } else {
                await axios.post(`${API_BASE}/etching/${endpoint}`, data);
            }
            await fetchStatus();
        } catch (e) {
            alert("指令反馈异常: " + (e.response?.data?.detail || e.message));
        } finally {
            setIsProcessing(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        const newMsgs = [...messages, { role: 'user', content: inputText }];
        setMessages(newMsgs);
        setInputText('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/etching/chat`, { message: inputText, history: newMsgs, model: llmModel });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.reply,
                thought: res.data.thought
            }]);
            setTimeout(fetchStatus, 500);
        } catch (e) { alert("AI 指挥系统未响应"); } finally { setLoading(false); }
    };

    const isConnected = statusData.bridge.is_connected || (statusData.bridge.state && statusData.bridge.state.bridge_internal_state !== 'DISCONNECTED') || Date.now() < stickyConnectedUntilRef.current;
    const latestDiDt = chartData.length > 0 ? chartData[chartData.length - 1].di_dt : 0;
    const latestDepth = statusData.bridge.state.pulse_cnt / 1000 || 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '400px 1fr 340px', gap: '20px', padding: '20px', background: 'var(--bg-main)', overflow: 'hidden' }}>
            {/* 左翼：AI 指挥与链路日志 */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden', background: 'var(--bg-card)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <button onClick={() => setActiveTab('agent')} style={{ background: 'none', border: 'none', color: activeTab === 'agent' ? 'var(--primary)' : 'var(--text-main)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} /> AI 指挥官
                    </button>
                    <button onClick={() => setActiveTab('monitor')} style={{ background: 'none', border: 'none', color: activeTab === 'monitor' ? 'var(--primary)' : 'var(--text-dim)', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={14} /> 链路日志
                    </button>
                </div>

                <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'agent' ? (
                            <motion.div key="agent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {messages.map((m, i) => (
                                    <div key={i} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        {m.thought && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.03)', padding: '8px 12px', borderRadius: '8px', marginBottom: '4px', borderLeft: '3px solid #6366F1', maxWidth: '90%', fontStyle: 'italic' }}>
                                                <div style={{ fontWeight: 800, fontSize: '10px', marginBottom: '2px', color: '#6366F1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Cpu size={10} /> THOUGHT PROCESS
                                                </div>
                                                {m.thought}
                                            </div>
                                        )}
                                        <div style={{ padding: '12px 16px', borderRadius: '14px', background: m.role === 'assistant' ? 'var(--bg-main)' : 'var(--primary)', color: m.role === 'assistant' ? 'var(--text-main)' : '#fff', fontSize: '12.5px', border: m.role === 'assistant' ? '1px solid var(--border)' : 'none', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '95%' }}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <RefreshCw size={12} className="spin" /> 正在通过物理模型计算实验设计...
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="monitor" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <LinkLogPanel logs={monitorLogs} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                    <div style={{ position: 'relative' }}>
                        <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="输入自然语言指令" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '13px' }} />
                        <button onClick={sendMessage} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--primary)' }}>
                            {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* 中间布局省略部分与原有基本一致 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 状态卡片 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>⚡ dI/dt</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981' }}>{latestDiDt}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>📏 Depth</div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{latestDepth.toFixed(2)}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ color: statusData.bridge.state.sys_state === 0 ? '#10B981' : '#3B82F6', fontWeight: 800 }}>
                            {statusData.bridge.state.sys_state === 0 ? 'IDLE' : 'ETCHING'}
                        </div>
                    </div>
                </div>
                {/* 曲线图 */}
                <div className="glass-card" style={{ flex: 1, padding: '24px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 'auto']} />
                            <Tooltip />
                            <Line type="monotone" dataKey="di_dt" stroke="#10B981" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 右翼布局省略与原有基本一致 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}><b>硬件连接</b></div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                        <button onClick={() => setConnectMode('serial')} style={{ flex: 1, padding: '8px', background: connectMode === 'serial' ? 'var(--primary)' : 'var(--bg-main)', color: connectMode === 'serial' ? '#fff' : 'var(--text-main)', border: 'none', borderRadius: '6px' }}>Serial</button>
                        <button onClick={() => setConnectMode('ws')} style={{ flex: 1, padding: '8px', background: connectMode === 'ws' ? 'var(--primary)' : 'var(--bg-main)', color: connectMode === 'ws' ? '#fff' : 'var(--text-main)', border: 'none', borderRadius: '6px' }}>Wireless</button>
                    </div>
                    <button onClick={() => isConnected ? handleHwAction('disconnect_bridge') : handleHwAction('connect_bridge')} style={{ width: '100%', padding: '12px', background: isConnected ? '#EF4444' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800 }}>
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                </div>

                <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
                    <div style={{ marginBottom: '16px' }}><b>实验配置</b></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ fontSize: '10px' }}>Depth</label>
                            <input type="number" value={manualDepth} onChange={e => setManualDepth(Number(e.target.value))} style={{ width: '100%', padding: '6px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '10px' }}>Time</label>
                            <input type="number" value={manualTime} onChange={e => setManualTime(Number(e.target.value))} style={{ width: '100%', padding: '6px' }} />
                        </div>
                    </div>
                    <button disabled={!isConnected} onClick={() => handleHwAction('auto_start', { depth_um: manualDepth, time_s: manualTime, counts: manualCounts })} style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800 }}>启动刻蚀</button>
                    <button onClick={() => handleHwAction('command', { flag: 7 })} style={{ width: '100%', padding: '10px', marginTop: '10px', border: '2px solid #EF4444', color: '#EF4444', background: 'transparent', borderRadius: '8px', fontWeight: 800 }}>紧急停止</button>
                </div>
            </div>
        </motion.div>
    );
};

export default EtchingConsole;
