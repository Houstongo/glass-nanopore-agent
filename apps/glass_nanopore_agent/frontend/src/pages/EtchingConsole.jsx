import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Terminal, Send, Activity, Settings2, RefreshCw, Zap, AlertOctagon,
    MoveUp, MoveDown, RotateCcw, RotateCw, Cpu, Gauge, Wifi, Pause,
    Play, Layers, ShieldAlert, Sparkles, MessageSquare, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Tag, Space, Badge, Tooltip as AntTooltip, InputNumber } from 'antd';
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
    const [messages, setMessages] = useState([{
        role: 'assistant',
        content: '🚀 **原子级刻蚀指挥系统已就绪**。我是您的 AI 实验助手，已成功挂载底层驱动硬件。您可以尝试输入：“制备一个锥角为15°的纳米尖端”。'
    }]);

    // 2. 交互相关
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [connectMode, setConnectMode] = useState('ws');

    // 3. 实验关键参数
    const [manualDepth, setManualDepth] = useState(600);
    const [manualTime, setManualTime] = useState(30);

    const { logs: monitorLogs, addEventLog, ingestHardwareLogs } = useLinkLogger(120);

    // 模拟数据更新与状态获取 (逻辑保持不变)
    useEffect(() => {
        const timer = setInterval(() => {
            fetchStatus();
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/etching/status`);
            applySnapshot(res.data);
        } catch (e) { }
    };

    const applySnapshot = (snapshot) => {
        if (!snapshot?.bridge?.state) return;
        setStatusData(snapshot);
        ingestHardwareLogs(snapshot.bridge.state.raw_log || []);

        // 模拟图表逻辑 (简化版，仅用于 UI 展示同步)
        const newState = snapshot.bridge.state;
        const current_nA = (newState.adc_val / 4096) * 1000;
        setChartData(prev => [...prev, { time: new Date().toLocaleTimeString(), val: current_nA }].slice(-100));
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;
        const userMsg = { role: 'user', content: inputText };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsProcessing(true);

        try {
            const res = await axios.post(`${API_BASE}/etching/chat`, {
                message: inputText,
                model: llmModel
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ 通讯中断，请检查后端 API 状态。" }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const isConnected = statusData.bridge?.is_connected;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', position: 'relative', background: '#F8FAFC' }}>
            {/* 背景装饰 (RAG 风格) */}
            <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', gap: '24px', height: '100%', minHeight: 0, zIndex: 1 }}>

                {/* 左侧：原子级实时监测 (RAG 主内容风格) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>

                    {/* 1. 实时曲线卡片 */}
                    <div className="glass-card" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1E293B', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Activity size={26} color="var(--primary)" /> 原子刻蚀流实时遥测
                                </h1>
                                <p style={{ color: '#64748B', fontSize: '14px' }}>基于分流器 ADC 回传的离子电流微变化，实时感知物理刻蚀进度。</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Badge count={isConnected ? "CONNECTED" : "OFFLINE"} style={{ background: isConnected ? '#10B981' : '#EF4444', fontWeight: 800 }} />
                                <div style={{ background: '#F1F5F9', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                    <button onClick={() => setConnectMode('ws')} style={{ padding: '6px 16px', borderRadius: '7px', border: 'none', fontSize: '12px', fontWeight: 700, background: connectMode === 'ws' ? '#fff' : 'transparent', color: connectMode === 'ws' ? 'var(--primary)' : '#64748B', cursor: 'pointer' }}>WS</button>
                                    <button onClick={() => setConnectMode('serial')} style={{ padding: '6px 16px', borderRadius: '7px', border: 'none', fontSize: '12px', fontWeight: 700, background: connectMode === 'serial' ? '#fff' : 'transparent', color: connectMode === 'serial' ? 'var(--primary)' : '#64748B', cursor: 'pointer' }}>COM</button>
                                </div>
                            </div>
                        </div>

                        {/* 数据图表 */}
                        <div style={{ flex: 1, minHeight: '300px', background: '#fff', borderRadius: '24px', border: '1px solid #F1F5F9', padding: '24px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }} />
                                    <Line type="monotone" dataKey="val" stroke="var(--primary)" strokeWidth={3} dot={false} animationDuration={300} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. 链路监控 (RAG 列表风格) */}
                    <div className="glass-card" style={{ height: '240px', overflow: 'hidden' }}>
                        <LinkLogPanel logs={monitorLogs} onClear={() => { }} />
                    </div>
                </div>

                {/* 右侧：AI 实验官指挥中心 (RAG 侧边栏风格但宽度较大) */}
                <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* AI 对话面板 */}
                    <div className="glass-card" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sparkles size={20} color="var(--primary)" />
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>AI 实验指挥官</h2>
                        </div>

                        {/* 聊天记录 */}
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px' }}>
                            {messages.map((msg, i) => (
                                <div key={i} style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '90%',
                                    padding: '12px 16px',
                                    borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                    background: msg.role === 'user' ? 'var(--primary)' : '#F1F5F9',
                                    color: msg.role === 'user' ? '#fff' : '#1E293B',
                                    fontSize: '14px',
                                    lineHeight: 1.5,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}>
                                    {typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content)}
                                </div>
                            ))}
                            {isProcessing && (
                                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', padding: '12px' }}>
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }} />
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }} />
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }} />
                                </div>
                            )}
                        </div>

                        {/* 输入框 */}
                        <div style={{ position: 'relative' }}>
                            <input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="指令下达..."
                                style={{
                                    width: '100%', padding: '14px 50px 14px 16px', borderRadius: '14px', border: '1px solid #E2E8F0',
                                    background: '#F8FAFC', outline: 'none', fontSize: '14px'
                                }}
                            />
                            <button
                                onClick={handleSendMessage}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--primary)', border: 'none', color: '#fff', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    {/* 硬件底层精调 */}
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Database size={18} color="var(--primary)" />
                            <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>物理实验参数精调</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, marginBottom: '6px', display: 'block' }}>深度目标 (μm)</label>
                                <InputNumber value={manualDepth} onChange={setManualDepth} style={{ width: '100%', borderRadius: '10px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, marginBottom: '6px', display: 'block' }}>时长预期 (s)</label>
                                <InputNumber value={manualTime} onChange={setManualTime} style={{ width: '100%', borderRadius: '10px' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button type="primary" block size="large" style={{ flex: 2, height: '48px', borderRadius: '12px', fontWeight: 800 }}>启动刻蚀任务</Button>
                            <Button danger block size="large" style={{ flex: 1, height: '48px', borderRadius: '12px', fontWeight: 800 }}>强停</Button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .glass-card {
                    background: #ffffff;
                    border: 1px solid #E2E8F0;
                    border-radius: 24px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
                }
                .custom-scroll::-webkit-scrollbar { width: 4px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default EtchingConsole;
