import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Search, Info, Sliders, Target, ShieldCheck, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const PoreMeasurement = () => {
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [poreSize, setPoreSize] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [baseline, setBaseline] = useState(12.5); // nA

    // 模拟离子电流数据分析
    useEffect(() => {
        let interval;
        if (isMeasuring) {
            interval = setInterval(() => {
                setChartData(prev => {
                    const time = prev.length;
                    // 模拟基底电流波纹 + 随机阻塞事件
                    const isBlocking = Math.random() > 0.95;
                    const blockDepth = isBlocking ? (Math.random() * 2 + 1) : 0;
                    const current = baseline - blockDepth + (Math.random() * 0.2 - 0.1);

                    if (isBlocking) {
                        // 简单的孔径估算逻辑：根据阻塞深度 delta_I
                        const estimatedSize = (blockDepth * 5.2).toFixed(1);
                        setPoreSize(estimatedSize);
                    }

                    const newData = [...prev, {
                        time,
                        current: current.toFixed(2),
                        blocking: isBlocking ? 1 : 0
                    }];
                    return newData.slice(-100);
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isMeasuring, baseline]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px', overflow: 'hidden', background: '#F8FAFC' }}>
            {/* 顶栏：测量状态 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px', opacity: 0.1 }}><Target size={64} /></div>
                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>实时估算孔径 (Estimated)</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)' }}>
                        {poreSize} <span style={{ fontSize: '16px', fontWeight: 500 }}>nm</span>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>基准离子电流 (Open Channel)</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#10B981' }}>
                        {baseline} <span style={{ fontSize: '16px', fontWeight: 500 }}>nA</span>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginBottom: '8px' }}>信噪比 (SNR)</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B' }}>
                        18.4 <span style={{ fontSize: '16px', fontWeight: 500 }}>dB</span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', minHeight: 0 }}>
                {/* 左侧：离子电流分析面板 */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1E293B' }}>离子电流阻塞分析 (I-t Curve)</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>正在分析 1M KCl 缓冲液下的孔谱特征...</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ padding: '4px 12px', background: isMeasuring ? '#DCFCE7' : '#F1F5F9', color: isMeasuring ? '#166534' : '#64748B', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isMeasuring ? '#22C55E' : '#94A3B8', animation: isMeasuring ? 'pulse 2s infinite' : 'none' }} />
                                {isMeasuring ? "ANALYZING" : "STANDBY"}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="current" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorCurrent)" animationDuration={100} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 右侧：测量配置 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sliders size={16} /> 测量参数
                        </h4>

                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>电压偏置 (mV)</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[100, 200, 300, 500].map(v => (
                                    <button key={v} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', background: v === 200 ? '#EEF2FF' : '#fff', color: v === 200 ? 'var(--primary)' : '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{v}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>滤波器截止频率 (kHz)</label>
                            <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                                <option>5 kHz (Bessel)</option>
                                <option>10 kHz (Bessel)</option>
                                <option selected>100 kHz (Wideband)</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setIsMeasuring(!isMeasuring)}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                                background: isMeasuring ? '#F43F5E' : 'var(--primary)', color: '#fff',
                                fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                marginTop: '10px'
                            }}
                        >
                            <Zap size={18} fill={isMeasuring ? "none" : "#fff"} /> {isMeasuring ? "停止数据采集" : "开始实时孔谱测量"}
                        </button>
                    </div>

                    <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: '#fff' }}>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={14} color="#10B981" /> 算法置信度 (Confidence)
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px' }}>96.5%</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>基于 20,480 个采样点 FFT 计算</div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default PoreMeasurement;
