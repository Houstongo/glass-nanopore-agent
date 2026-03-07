import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Sliders, Target, ShieldCheck, Zap,
    RefreshCcw, Save, PlayCircle, PauseCircle, LayoutPanelTop,
    Cpu, Database, AlertTriangle, Search, Info, CheckCircle2
} from 'lucide-react';
import { Card, Button, InputNumber, Tag, Space, Badge } from 'antd';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';

const PoreMeasurement = () => {
    // 1. 硬件状态
    const [hwStats, setHwStats] = useState({
        v_offset: 200,
        gain_x: 50,
        filter_f: 10,
        sample_r: 100
    });

    // 2. 测量控制与模式
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [status, setStatus] = useState('idle');
    const [poreSize, setPoreSize] = useState(0);
    const [chartData, setChartData] = useState([]);

    // 3. 存储参数
    const [params, setParams] = useState({
        p1: 128, p2: 64, p3: 32, p4: 16, p5: 255
    });

    // 4. 指令监控
    const [cmdLog, setCmdLog] = useState([
        { time: new Date().toLocaleTimeString(), hex: 'AA 01 FF', desc: '系统在线引导' }
    ]);

    const logCommand = (desc, hex) => {
        setCmdLog(prev => [{
            time: new Date().toLocaleTimeString(),
            hex: hex.toUpperCase(),
            desc
        }, ...prev].slice(0, 10));
    };

    // 模拟数据流
    useEffect(() => {
        let interval;
        if (isMeasuring && status !== 'paused') {
            interval = setInterval(() => {
                const base = status === 'auto' ? 15.2 : 12.8;
                const nextCurrent = (parseFloat(base) + Math.random() * 0.4).toFixed(2);
                setChartData(prev => [...prev, { time: prev.length, val: nextCurrent }].slice(-60));
            }, 200);
        }
        return () => clearInterval(interval);
    }, [isMeasuring, status]);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', position: 'relative', background: '#F8FAFC' }}>
            {/* 背景装饰 (RAG 风格) */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', gap: '24px', height: '100%', minHeight: 0, zIndex: 1 }}>

                {/* 左侧：参数与指令流 (RAG 风格侧边栏布局) */}
                <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* 硬件信息与参数存储 */}
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={20} color="var(--primary)" /> 硬件参数存储
                            </h2>
                            <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 700 }}>EPROM</Tag>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { id: 'p1', label: '检测触发阈值' },
                                { id: 'p2', label: '高压关断阈值' },
                                { id: 'p3', label: '阻塞监测周期' },
                                { id: 'p4', label: '信号过滤系数' },
                                { id: 'p5', label: '电流突变极值' }
                            ].map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{p.label}</span>
                                    <InputNumber
                                        size="small" min={0} max={255}
                                        value={params[p.id]}
                                        onChange={v => setParams(prev => ({ ...prev, [p.id]: v }))}
                                        style={{ width: '100px', borderRadius: '8px' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <Button
                            type="primary" block size="large" icon={<Save size={18} />}
                            onClick={() => {
                                const hex = Object.values(params).map(v => v.toString(16).padStart(2, '0')).join(' ').toUpperCase();
                                logCommand('全参数同步', `AA 00 ${hex} FF`);
                            }}
                            style={{ height: '48px', borderRadius: '12px', fontWeight: 700 }}
                        >同步参数并存储 (0x00)</Button>
                    </div>

                    {/* 指令监控流 */}
                    <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 800, fontSize: '14px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Cpu size={16} /> 测量协议监控
                        </div>
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                            <AnimatePresence initial={false}>
                                {cmdLog.map((l, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', marginBottom: '4px', borderRadius: '8px', background: i === 0 ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                                        <span style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'monospace' }}>{String(l.time)}</span>
                                        <code style={{ fontSize: '12px', color: '#1E293B', fontWeight: 700 }}>{String(l.hex)}</code>
                                        <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '12px' }}>{typeof l.desc === 'object' ? JSON.stringify(l.desc) : String(l.desc)}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 右侧：测量分析中心 (RAG 主内容风格) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <div className="glass-card" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>

                        {/* 顶部标题与状态 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Activity size={24} color="var(--primary)" /> 纳米孔离子电流分析引擎
                                </h2>
                                <p style={{ color: '#64748B', fontSize: '14px' }}>实时监控样本电流波动，自动拟合孔径曲线以获取高精度测量结果。</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Badge count={isMeasuring ? "LIVE" : "READY"} style={{ background: isMeasuring ? 'var(--primary)' : '#94A3B8', fontWeight: 800 }} />
                                <Tag color={status === 'auto' ? 'blue' : status === 'manual' ? 'orange' : 'default'} style={{ borderRadius: '6px', fontWeight: 700 }}>
                                    {status === 'auto' ? '自动测量' : status === 'manual' ? '手动模式' : '就绪'}
                                </Tag>
                            </div>
                        </div>

                        {/* 数据面板 (RAG 引用风格) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {[
                                { label: '偏置电压', val: hwStats.v_offset, unit: 'mV', color: '#6366F1', icon: Zap },
                                { label: '信号增益', val: hwStats.gain_x, unit: 'x', color: '#8B5CF6', icon: Target },
                                { label: '数字滤波', val: hwStats.filter_f, unit: 'pt', color: '#06B6D4', icon: ShieldCheck },
                                { label: '采样位深', val: hwStats.sample_r, unit: 'bit', color: '#EC4899', icon: LayoutPanelTop }
                            ].map((s, i) => (
                                <div key={i} style={{ padding: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
                                        <s.icon size={12} color={s.color} /> {s.label}
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1E293B' }}>
                                        {s.val}<span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginLeft: '4px' }}>{s.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 高清图表区 */}
                        <div style={{ flex: 1, background: '#fff', border: '1px solid #F1F5F9', borderRadius: '20px', padding: '20px', marginTop: '10px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                                    <ChartTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }} />
                                    <Area type="monotone" dataKey="val" stroke="#6366F1" fillOpacity={1} fill="url(#colorPore)" strokeWidth={3} animationDuration={300} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* 底部控制栏 */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '10px 0' }}>
                            <div style={{ textAlign: 'center', marginRight: '40px' }}>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}>当前孔径估算</div>
                                <div style={{ fontSize: '42px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px' }}>
                                    {poreSize || '8.45'}<span style={{ fontSize: '18px', marginLeft: '6px' }}>nm</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Button
                                    type={status === 'auto' ? 'primary' : 'default'}
                                    size="large" icon={<Zap size={18} />}
                                    onClick={() => { setStatus('auto'); setIsMeasuring(true); logCommand('启动自动测量', 'AA 02 FF'); }}
                                    style={{ height: '54px', borderRadius: '14px', fontWeight: 800, padding: '0 32px' }}
                                >自动测量</Button>
                                <Button
                                    type={status === 'manual' ? 'primary' : 'default'}
                                    size="large" icon={<Sliders size={18} />}
                                    onClick={() => { setStatus('manual'); setIsMeasuring(true); logCommand('手动引导测量', 'AA 03 C8 32 0A 64 FF'); }}
                                    style={{ height: '54px', borderRadius: '14px', fontWeight: 800, padding: '0 32px' }}
                                >手动测量</Button>
                                <Button
                                    icon={status === 'paused' ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
                                    disabled={!isMeasuring}
                                    onClick={() => {
                                        if (status === 'paused') { setStatus('auto'); logCommand('恢复测量', 'AA 04 01 FF'); }
                                        else { setStatus('paused'); logCommand('暂停测量', 'AA 04 00 FF'); }
                                    }}
                                    style={{ height: '54px', width: '54px', borderRadius: '14px' }}
                                />
                                <Button
                                    danger icon={<RefreshCcw size={18} />}
                                    onClick={() => { setStatus('idle'); setIsMeasuring(false); setChartData([]); logCommand('系统重置', 'AA 01 FF'); }}
                                    style={{ height: '54px', borderRadius: '14px', fontWeight: 700 }}
                                >复位</Button>
                            </div>
                        </div>
                    </div>

                    {/* 底部提示卡 (RAG 风格) */}
                    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#3730A3' }}>
                        <Info size={18} style={{ marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                            <b>测量建议:</b> 实时采集频率已设置为 100KHz。请观测 <b><span style={{ color: 'var(--primary)' }}>电流突变极值</span></b>，若多次出现饱和，请检查样本背景噪声或调大滤波系数。
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

export default PoreMeasurement;
