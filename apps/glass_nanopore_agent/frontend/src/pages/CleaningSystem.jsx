import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MoveUp, MoveDown, RotateCcw, RotateCw, Pause, Play,
    Waves, MousePointer2, Cpu, Settings2, Timer, Zap,
    AlertCircle, Activity, Trash2, RefreshCcw, Info
} from 'lucide-react';
import { Card, Button, InputNumber, Tag, Space, Progress } from 'antd';

const CleaningSystem = () => {
    // 1. 系统模式与状态
    const [mode, setMode] = useState('manual');
    const [status, setStatus] = useState('idle');
    const [mechanicalX, setMechanicalX] = useState('stop');
    const [mechanicalR, setMechanicalR] = useState('stop');

    // 2. 超声参数
    const [ultrasonicTime, setUltrasonicTime] = useState(60);

    // 3. 指令流监控
    const [commandLog, setCommandLog] = useState([
        { time: new Date().toLocaleTimeString(), hex: 'AA 55 00 FF', desc: '初始化手动模式' }
    ]);

    const sendCommand = (desc, hex) => {
        setCommandLog(prev => [{
            time: new Date().toLocaleTimeString(),
            hex: hex.toUpperCase(),
            desc
        }, ...prev].slice(0, 10));
    };

    const handleMovement = (type, action) => {
        let hex = '';
        let desc = '';
        if (type === 'arm') {
            if (action === 'up') { hex = 'AA 11 11 FF'; desc = '机械臂上升'; setMechanicalX('up'); }
            if (action === 'down') { hex = 'AA 12 11 FF'; desc = '机械臂下降'; setMechanicalX('down'); }
            if (action === 'stop_up') { hex = 'AA 11 00 FF'; desc = '轴停止 (上)'; setMechanicalX('stop'); }
            if (action === 'stop_down') { hex = 'AA 12 00 FF'; desc = '轴停止 (下)'; setMechanicalX('stop'); }
        } else {
            if (action === 'cw') { hex = 'AA 21 11 FF'; desc = '电机顺转'; setMechanicalR('cw'); }
            if (action === 'ccw') { hex = 'AA 22 11 FF'; desc = '电机逆转'; setMechanicalR('ccw'); }
            if (action === 'stop_cw') { hex = 'AA 21 00 FF'; desc = '旋转停止 (顺)'; setMechanicalR('stop'); }
            if (action === 'stop_ccw') { hex = 'AA 22 00 FF'; desc = '旋转停止 (逆)'; setMechanicalR('stop'); }
        }
        sendCommand(desc, hex);
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', position: 'relative', background: '#F8FAFC' }}>
            {/* 背景装饰 (RAG 风格) */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', gap: '24px', height: '100%', minHeight: 0, zIndex: 1 }}>

                {/* 左侧：可视化监控区 (RAG 风格侧边栏布局) */}
                <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* 状态总览卡片 */}
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={20} color="var(--primary)" /> 实时清洗状态
                            </h2>
                            <Tag color={mode === 'auto' ? 'blue' : 'orange'} style={{ borderRadius: '6px', fontWeight: 700 }}>
                                {mode === 'auto' ? '自动' : '手动'}
                            </Tag>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}>Z轴升降</div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{mechanicalX === 'up' ? '正在上升' : mechanicalX === 'down' ? '正在下降' : '轴静止'}</div>
                            </div>
                            <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}>超声模块</div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{status === 'running' ? '清洗中' : '空闲'}</div>
                            </div>
                        </div>

                        {/* 虚拟设备占位 (高清版) */}
                        <div style={{
                            height: '240px',
                            background: 'linear-gradient(135deg, #fff 0%, #F1F5F9 100%)',
                            borderRadius: '16px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                style={{ position: 'absolute', width: '200px', height: '200px', background: 'var(--primary)', borderRadius: '50%', filter: 'blur(60px)' }}
                            />
                            <Waves size={60} color="var(--primary)" style={{ opacity: 0.3, zIndex: 1 }} />
                        </div>
                    </div>

                    {/* 指令日志 (RAG 列表风格) */}
                    <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 800, fontSize: '14px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Cpu size={16} /> 硬件指令流监控
                        </div>
                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                            <AnimatePresence initial={false}>
                                {commandLog.map((log, i) => (
                                    <motion.div
                                        key={log.time + i}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                                            borderRadius: '10px', marginBottom: '4px',
                                            background: i === 0 ? 'rgba(99,102,241,0.05)' : 'transparent',
                                            border: i === 0 ? '1px solid rgba(99,102,241,0.1)' : '1px solid transparent'
                                        }}
                                    >
                                        <div style={{ minWidth: '70px', fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace' }}>{String(log.time)}</div>
                                        <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '11px' }}>TX</div>
                                        <code style={{ fontSize: '12px', color: '#1E293B', fontWeight: 700 }}>{String(log.hex)}</code>
                                        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B' }}>{typeof log.desc === 'object' ? JSON.stringify(log.desc) : String(log.desc)}</div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 右侧：主控制中心 (RAG 主内容风格) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <div className="glass-card" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                        {/* 1. 模式与系统重置 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1E293B', margin: '0 0 8px 0' }}>清洗工艺控制台</h1>
                                <p style={{ color: '#64748B', fontSize: '14px' }}>基于 RAG 知识库推荐的标准化清洗流程，支持手动点流与自动化编排。</p>
                            </div>
                            <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <button
                                    onClick={() => { setMode('manual'); sendCommand('切换手动模式', 'AA 55 00 FF'); }}
                                    style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: mode === 'manual' ? '#fff' : 'transparent', color: mode === 'manual' ? 'var(--primary)' : '#64748B', boxShadow: mode === 'manual' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                                >手动点控</button>
                                <button
                                    onClick={() => { setMode('auto'); sendCommand('切换自动模式', 'AA 55 01 FF'); }}
                                    style={{ padding: '8px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: mode === 'auto' ? '#fff' : 'transparent', color: mode === 'auto' ? 'var(--primary)' : '#64748B', boxShadow: mode === 'auto' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                                >自动引导</button>
                            </div>
                        </div>

                        {/* 2. 核心动力控制 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            <section>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MousePointer2 size={14} /> Z轴 升降台控制 (11/12)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <Button
                                        size="large" icon={<MoveUp size={18} />}
                                        onMouseDown={() => handleMovement('arm', 'up')}
                                        onMouseUp={() => handleMovement('arm', 'stop_up')}
                                        style={{ height: '60px', borderRadius: '16px', fontSize: '15px', fontWeight: 700 }}
                                    >上升</Button>
                                    <Button
                                        size="large" icon={<MoveDown size={18} />}
                                        onMouseDown={() => handleMovement('arm', 'down')}
                                        onMouseUp={() => handleMovement('arm', 'stop_down')}
                                        style={{ height: '60px', borderRadius: '16px', fontSize: '15px', fontWeight: 700 }}
                                    >下降</Button>
                                </div>
                            </section>

                            <section>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Settings2 size={14} /> R轴 旋转盘控制 (21/22)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <Button
                                        icon={<RotateCw size={20} />}
                                        onClick={() => handleMovement('rotor', 'cw')}
                                        style={{ height: '60px', borderRadius: '16px', background: mechanicalR === 'cw' ? 'rgba(99,102,241,0.08)' : '#F8FAFC', border: mechanicalR === 'cw' ? '1px solid var(--primary)' : '1px solid #E2E8F0' }}
                                    />
                                    <Button
                                        danger icon={<Pause size={20} />}
                                        onClick={() => {
                                            if (mechanicalR === 'cw') handleMovement('rotor', 'stop_cw');
                                            if (mechanicalR === 'ccw') handleMovement('rotor', 'stop_ccw');
                                        }}
                                        style={{ height: '60px', borderRadius: '16px', fontWeight: 800 }}
                                    >停止</Button>
                                    <Button
                                        icon={<RotateCcw size={20} />}
                                        onClick={() => handleMovement('rotor', 'ccw')}
                                        style={{ height: '60px', borderRadius: '16px', background: mechanicalR === 'ccw' ? 'rgba(99,102,241,0.08)' : '#F8FAFC', border: mechanicalR === 'ccw' ? '1px solid var(--primary)' : '1px solid #E2E8F0' }}
                                    />
                                </div>
                            </section>
                        </div>

                        {/* 3. 清洗任务流与样品管理 */}
                        <section style={{ background: '#F8FAFC', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Waves size={14} /> 超声清洗与流程预置
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', padding: '8px 16px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                                    <Timer size={16} color="#64748B" />
                                    <InputNumber
                                        value={ultrasonicTime}
                                        onChange={setUltrasonicTime}
                                        style={{ width: '60px', fontWeight: 800, fontSize: '16px' }}
                                    />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8' }}>秒</span>
                                    <Button
                                        type="primary" icon={<Zap size={16} />}
                                        onClick={() => {
                                            const timeHex = ultrasonicTime.toString(16).padStart(2, '0').toUpperCase();
                                            sendCommand(`启动超声清洗 (${ultrasonicTime}秒)`, `AA 55 03 ${timeHex} FF`);
                                        }}
                                        style={{ borderRadius: '10px', marginLeft: '10px' }}
                                    >执行清洗指令</Button>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <Button
                                        icon={<RefreshCcw size={16} />}
                                        onClick={() => sendCommand('准备测量', 'AA 55 02 FF')}
                                        style={{ height: '48px', borderRadius: '12px', padding: '0 24px', fontWeight: 600 }}
                                    >准备测量 (02)</Button>
                                    <Button
                                        icon={<Trash2 size={16} />}
                                        onClick={() => sendCommand('切换样品', 'AA 55 04 FF')}
                                        style={{ height: '48px', borderRadius: '12px', padding: '0 24px', fontWeight: 600 }}
                                    >切换样品 (04)</Button>
                                </div>
                            </div>
                        </section>

                        {/* 4. 紧急制动 (底部居中) */}
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
                            <Button
                                danger type="primary" size="large" icon={<AlertCircle size={22} />}
                                onClick={() => {
                                    setMechanicalX('stop');
                                    setMechanicalR('stop');
                                    sendCommand('系统紧急强停', 'AA 01 FF');
                                }}
                                style={{ height: '64px', padding: '0 60px', borderRadius: '20px', fontSize: '18px', fontWeight: 900 }}
                            >
                                紧急强停 (EMERGENCY STOP)
                            </Button>
                        </div>
                    </div>

                    {/* 下方知识提示 (RAG 风格) */}
                    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#3730A3' }}>
                        <Info size={18} style={{ marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                            <b>系统提示:</b> 当前所有清洗参数均已同步至 RAG 知识库。如果是处理 <b><span style={{ color: 'var(--primary)' }}>玻璃纳米通道</span></b>，建议超声时长设置为 45-60 秒，并确保气压稳定在 0.2MPa。
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
                .ant-btn-primary { background: var(--primary) !important; }
            `}</style>
        </div>
    );
};

export default CleaningSystem;
