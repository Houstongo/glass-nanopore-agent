import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Play, Pause, RotateCcw, Activity, Thermometer, Wind, Timer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CleaningSystem = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [intensity, setIntensity] = useState(45);
    const [flowRate, setFlowRate] = useState(1.2);
    const [timeRemaining, setTimeRemaining] = useState(300);
    const [chartData, setChartData] = useState([]);

    // 模拟数据生成
    useEffect(() => {
        const interval = setInterval(() => {
            if (isRunning && timeRemaining > 0) {
                setTimeRemaining(prev => prev - 1);
                setChartData(prev => {
                    const newData = [...prev, {
                        time: 300 - timeRemaining,
                        pressure: (Math.random() * 0.2 + 0.9).toFixed(2),
                        flux: (flowRate + (Math.random() * 0.1 - 0.05)).toFixed(2)
                    }];
                    return newData.slice(-50);
                });
            } else if (timeRemaining === 0) {
                setIsRunning(false);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, timeRemaining, flowRate]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px', overflow: 'hidden', background: '#F8FAFC' }}>
            {/* 顶栏：系统摘要 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9' }}>
                        <Timer size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>剩余时间</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B' }}>{formatTime(timeRemaining)}</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>超声频率</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B' }}>40.2 kHz</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                        <Thermometer size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>槽液温度</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B' }}>24.5 °C</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1' }}>
                        <Wind size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>真空负压</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B' }}>-0.08 MPa</div>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', minHeight: 0 }}>
                {/* 左侧：可视化监控 */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Droplets size={18} color="#0EA5E9" /> 实时流控曲线
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0EA5E9' }} /> 压力 (bar)</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> 流速 (ml/min)</span>
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 2]} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="pressure" stroke="#0EA5E9" strokeWidth={3} dot={false} animationDuration={300} />
                                <Line type="monotone" dataKey="flux" stroke="#10B981" strokeWidth={3} dot={false} animationDuration={300} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 右侧：控制面板 */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'block' }}>超声强度 ({intensity}%)</label>
                        <input
                            type="range" min="0" max="100"
                            value={intensity}
                            onChange={(e) => setIntensity(e.target.value)}
                            style={{ width: '100%', accentColor: '#0EA5E9' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'block' }}>恒流泵流速 ({flowRate} ml/min)</label>
                        <input
                            type="range" min="0" max="5" step="0.1"
                            value={flowRate}
                            onChange={(e) => setFlowRate(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: '#10B981' }}
                        />
                    </div>

                    <div style={{ flex: 1 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={() => setIsRunning(!isRunning)}
                            style={{
                                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                                background: isRunning ? '#F43F5E' : '#0EA5E9', color: '#fff',
                                fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                boxShadow: isRunning ? '0 4px 12px rgba(244, 63, 94, 0.3)' : '0 4px 12px rgba(14, 165, 233, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isRunning ? <><Pause size={20} /> 停止清洗任务</> : <><Play size={20} /> 开始自动化清洗</>}
                        </button>
                        <button
                            onClick={() => setTimeRemaining(300)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid #E2E8F0',
                                background: '#fff', color: '#64748B',
                                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <RotateCcw size={16} /> 重置实验参数
                        </button>
                    </div>

                    <div style={{ background: '#F0F9FF', border: '1px solid #B9E6FE', borderRadius: '12px', padding: '12px', fontSize: '12px', color: '#0369A1' }}>
                        <b>智能检测:</b> 超声空化效应正常，未检测到纳米孔堵塞。
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CleaningSystem;
