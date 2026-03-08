
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Binary,
    Cable,
    CheckCircle2,
    Clock3,
    Command,
    Gauge,
    Pause,
    Play,
    RadioTower,
    RefreshCw,
    ShieldAlert,
    Save,
    SlidersHorizontal,
    Wifi,
    WifiOff,
    Zap
} from 'lucide-react';
import { Badge, Button, Input, InputNumber, Tag, message, Modal, Radio, Select, Divider } from 'antd';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis
} from 'recharts';
import LinkLogPanel from '../components/LinkLogPanel';
import useLinkLogger from '../hooks/useLinkLogger';
import {
    DEFAULT_PHASES,
    buildControlEvents,
    buildMockTrace,
    buildSystemEvents,
    getPhaseForProgress,
    pickNearestTraceIndex
} from './EtchingConsole.model';

// 默认地址仅为占位符，实际 IP 由路由器分配给 ESP8266（STA 模式 DHCP）
const DEFAULT_WS_URL = 'ws://192.168.1.1:81/';
const TIMELINE_POINT_LIMIT = 160;
const THRESHOLD_VALUE = 0.46;

function parseHexFrame(input) {
    const parts = input
        .trim()
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (!parts.length) {
        return { ok: false, error: '请输入 8 字节控制帧。' };
    }

    if (parts.length !== 8) {
        return { ok: false, error: '控制帧需要正好 8 个十六进制字节。' };
    }

    const bytes = parts.map((part) => Number.parseInt(part, 16));
    if (bytes.some((value) => Number.isNaN(value) || value < 0 || value > 0xFF)) {
        return { ok: false, error: '控制帧存在无效字节，请使用 00-FF。' };
    }

    if (bytes[0] !== 0xFF || bytes[7] !== 0xFF) {
        return { ok: false, error: '控制帧必须以 FF 起始并以 FF 结束。' };
    }

    return { ok: true, bytes };
}

function parseAdcPacket(payload) {
    if (!payload.startsWith('ADC2,')) return null;
    const fields = payload.trim().split(',');
    if (fields.length < 25) return null;

    const seq = Number.parseInt(fields[1], 10);
    const dropCount = Number.parseInt(fields[2], 10);
    const sampleCount = Number.parseInt(fields[3], 10);
    const values = fields.slice(4).map((value) => Number.parseFloat(value));

    if (!Number.isFinite(seq) || !Number.isFinite(dropCount) || !Number.isFinite(sampleCount)) {
        return null;
    }

    return {
        seq,
        dropCount,
        sampleCount,
        values: values.filter((value) => Number.isFinite(value))
    };
}

function formatFrame(bytes) {
    return bytes.map((value) => value.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

function buildRecipeFrame(depth, duration, counts, command = 0x03) {
    // STM32 usartCallback: echinglength = (RxBuf[2]<<8)|RxBuf[1]（小端序）
    // RxBuf[4]==0x00 触发自动刻蚀，RxBuf[5] 为循环次数
    const d = Number(depth);
    const bytes = [
        0xFF,
        d & 0xFF,                    // RxBuf[1] = depth_low
        (d >> 8) & 0xFF,             // RxBuf[2] = depth_high
        Number(duration) & 0xFF,     // RxBuf[3] = time_s
        0x00,                        // RxBuf[4] = 0x00 → 自动刻蚀模式
        Number(counts) & 0xFF,       // RxBuf[5] = counts
        command & 0xFF,              // RxBuf[6] = cmd（自动刻蚀时不使用）
        0xFF
    ];
    return formatFrame(bytes);
}

function buildTimelineFromPackets(samples) {
    if (!samples.length) {
        return buildMockTrace(140);
    }

    const visible = samples.slice(-TIMELINE_POINT_LIMIT);
    const span = Math.max(visible.length - 1, 1);

    return visible.map((sample, index) => {
        const progress = visible.length === 1 ? 100 : (index / span) * 100;
        const phase = getPhaseForProgress(progress, DEFAULT_PHASES);

        return {
            ...sample,
            progress: Number(progress.toFixed(2)),
            threshold: THRESHOLD_VALUE,
            phaseId: phase.id,
            phaseLabel: phase.label,
            timeLabel: `T+${String(sample.tick).padStart(3, '0')}ms`
        };
    });
}

const QUICK_COMMANDS = [
    { label: '旋转正向', cmd: 0x01, group: '旋转' },
    { label: '旋转反向', cmd: 0x02, group: '旋转' },
    { label: '旋转停止', cmd: 0x03, group: '旋转' },
    { label: 'Z 轴上升', cmd: 0x05, group: '运动' },
    { label: 'Z 轴下降', cmd: 0x06, group: '运动' },
    { label: 'Z 轴停止', cmd: 0x07, group: '运动' },
    { label: '增亮', cmd: 0x09, group: '显示' },
    { label: '降亮', cmd: 0x0A, group: '显示' },
    { label: 'AC 模式', cmd: 0x04, group: '模式' },
    { label: 'DC 模式', cmd: 0x08, group: '模式' },
    { label: '开启 Twins', cmd: 0x0E, group: '功能' },
    { label: '关闭 Twins', cmd: 0x0D, group: '功能' },
    { label: '中断状态 1', cmd: 0x0B, group: '系统' },
    { label: '中断状态 2', cmd: 0x0C, group: '系统' }
];

const GlassCard = ({ title, subtitle, extra, children, style }) => (
    <section
        style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: '24px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            ...style
        }}
    >
        {(title || extra) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                    {title && <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{title}</div>}
                    {subtitle && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{subtitle}</div>}
                </div>
                {extra}
            </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
);

const statusPalette = {
    disconnected: { dot: '#CBD5E1', text: '未连接', color: '#64748B' },
    connecting: { dot: '#F59E0B', text: '连接中', color: '#B45309' },
    connected: { dot: '#10B981', text: '已连接', color: '#047857' },
    error: { dot: '#EF4444', text: '异常', color: '#B91C1C' }
};

export default function EtchingConsole({ llmModel }) {
    const socketRef = useRef(null);
    const sampleTickRef = useRef(0);
    const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [rawFrameInput, setRawFrameInput] = useState('FF 00 12 08 02 00 03 FF');
    const [depth, setDepth] = useState(18);
    const [duration, setDuration] = useState(8);
    const [counts, setCounts] = useState(2);
    const [liveFollow, setLiveFollow] = useState(true);
    const [cursorProgress, setCursorProgress] = useState(100);
    const [packetStats, setPacketStats] = useState({ seq: 0, dropCount: 0, samples: 0 });
    const [packets, setPackets] = useState([]);
    const [commandModalVisible, setCommandModalVisible] = useState(false);

    // 波形发生器状态
    const [wfType, setWfType] = useState('SINE');
    const [wfFreq, setWfFreq] = useState(100);
    const [wfAmp, setWfAmp] = useState(10);
    const [wfHlev, setWfHlev] = useState(5);
    const [wfLlev, setWfLlev] = useState(-3);
    const [wfChannel, setWfChannel] = useState('C1');

    const { logs, addEventLog, clearLogs } = useLinkLogger(240);

    const timelineData = useMemo(() => buildTimelineFromPackets(packets), [packets]);

    useEffect(() => {
        if (liveFollow) {
            setCursorProgress(100);
        }
    }, [timelineData.length, liveFollow]);

    useEffect(() => () => {
        if (socketRef.current) {
            socketRef.current.close();
        }
    }, []);

    const selectedIndex = useMemo(() => pickNearestTraceIndex(timelineData, cursorProgress), [timelineData, cursorProgress]);
    const selectedPoint = timelineData[selectedIndex] || timelineData[timelineData.length - 1];
    const activePhase = selectedPoint ? getPhaseForProgress(selectedPoint.progress, DEFAULT_PHASES) : DEFAULT_PHASES[0];

    const handlePacket = (parsed) => {
        const nextSamples = parsed.values.map((value) => {
            sampleTickRef.current += 5;
            return {
                tick: sampleTickRef.current,
                current: Number(value.toFixed(3)),
                packetSeq: parsed.seq,
                dropCount: parsed.dropCount
            };
        });

        setPackets((prev) => [...prev, ...nextSamples].slice(-TIMELINE_POINT_LIMIT));
        setPacketStats({
            seq: parsed.seq,
            dropCount: parsed.dropCount,
            samples: parsed.sampleCount
        });

        addEventLog(`ADC2 seq=${parsed.seq} samples=${parsed.sampleCount} drop=${parsed.dropCount}`, parsed.dropCount > 0 ? 'WARN' : 'INFO', 'MCU');
    };

    const connectWs = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        try {
            setConnectionState('connecting');
            addEventLog(`尝试连接 ${wsUrl}`, 'INFO', 'SYS');
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                setConnectionState('connected');
                addEventLog('WebSocket 链路已建立', 'INFO', 'SYS');
                message.success('设备链路已连接');
            };

            socket.onmessage = (event) => {
                const payload = typeof event.data === 'string' ? event.data.trim() : '';
                const parsed = parseAdcPacket(payload);
                if (parsed) {
                    handlePacket(parsed);
                    return;
                }
                addEventLog(payload || '[binary message]', 'DEBUG', 'MCU');
            };

            socket.onerror = () => {
                setConnectionState('error');
                addEventLog('WebSocket 链路异常', 'ERROR', 'SYS');
                message.error('设备链路异常');
            };

            socket.onclose = () => {
                setConnectionState('disconnected');
                addEventLog('WebSocket 链路已关闭', 'WARN', 'SYS');
            };
        } catch (error) {
            setConnectionState('error');
            addEventLog(`连接失败: ${error.message}`, 'ERROR', 'SYS');
            message.error('连接失败');
        }
    };

    const disconnectWs = () => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setConnectionState('disconnected');
    };

    const sendFrame = (frameString, label = 'RAW') => {
        const parsed = parseHexFrame(frameString);
        if (!parsed.ok) {
            message.warning(parsed.error);
            addEventLog(parsed.error, 'WARN', 'SYS');
            return;
        }

        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            message.warning('当前未建立 WebSocket 链路');
            addEventLog('发送控制帧失败: WebSocket 未连接', 'WARN', 'SYS');
            return;
        }

        socketRef.current.send(formatFrame(parsed.bytes));
        addEventLog(`发送控制帧 ${label}: ${formatFrame(parsed.bytes)}`, 'INFO', 'SYS');
        message.success(`${label} 指令已发送`);
    };

    const sendSCPI = (cmd) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            message.warning('WebSocket 未连接');
            return;
        }
        socketRef.current.send(cmd);
        addEventLog(`SCPI: ${cmd}`, 'INFO', 'SYS');
        message.success(`指令 ${cmd} 已下发`);
    };

    const applyWaveform = () => {
        sendSCPI(`${wfChannel}:BSWV WVTP,${wfType}`);
        if (wfType !== 'DC') {
            sendSCPI(`${wfChannel}:BSWV FRQ,${wfFreq}`);
            sendSCPI(`${wfChannel}:BSWV AMP,${wfAmp}`);
        }
    };

    const applyLevels = () => {
        sendSCPI(`${wfChannel}:BSWV HLEV,${wfHlev},LLEV,${wfLlev}`);
    };

    const saveWaveformData = () => {
        if (!packets.length) {
            message.warning('当前无波形数据可保存');
            return;
        }
        const dataStr = JSON.stringify(packets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `etching_waveform_${new Date().getTime()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('波形数据已导出');
        addEventLog('波形数据已导出为 JSON', 'INFO', 'SYS');
    };

    const connectionMeta = statusPalette[connectionState];

    return (
        <div
            style={{
                width: '100%',
                height: 'calc(100vh - 64px)',
                display: 'flex',
                gap: '20px',
                padding: '20px',
                background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                overflow: 'hidden'
            }}
        >
            {/* 左侧主要区域 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
                {/* 顶部状态汇总 */}
                <GlassCard
                    title="刻蚀时序控制台"
                    subtitle="ADC2 信号遥测与设备实时状态"
                    extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.15)' }}>
                                <Badge color={connectionMeta.dot} status={connectionState === 'connected' ? 'success' : 'default'} />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: connectionMeta.color }}>{connectionMeta.text}</span>
                            </div>
                            <Tag color={activePhase.color} style={{ borderRadius: '12px', padding: '4px 16px', fontWeight: 800, border: 'none', color: '#FFF', background: activePhase.color }}>
                                阶段: {activePhase.label}
                            </Tag>
                        </div>
                    }
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '40px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.04em' }}>数据包序号</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B' }}>#{packetStats.seq}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.04em' }}>丢包计数</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: packetStats.dropCount > 0 ? '#EF4444' : '#1E293B' }}>{packetStats.dropCount}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.04em' }}>当前时间窗口</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B' }}>{selectedPoint?.timeLabel || 'T+000ms'}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.04em' }}>实时 ADC2 电流</div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#4F46E5' }}>{selectedPoint?.current?.toFixed(3) || '0.000'} <span style={{ fontSize: '14px' }}>uA</span></div>
                        </div>
                    </div>
                </GlassCard>

                {/* 实时波形 */}
                <GlassCard
                    title="尖端刻蚀电信号时序序列"
                    style={{ flex: 2, display: 'flex', flexDirection: 'column' }}
                    extra={
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button size="small" icon={<Save size={14} />} onClick={saveWaveformData}>保存</Button>
                            <Button size="small" icon={<RefreshCw size={14} />} onClick={() => setPackets([])}>复位</Button>
                            <Button size="small" type={liveFollow ? 'primary' : 'default'} onClick={() => setLiveFollow(!liveFollow)}>
                                {liveFollow ? '实时' : '单点'}
                            </Button>
                        </div>
                    }
                >
                    <div style={{ flex: 1, background: '#FFFFFF', borderRadius: '16px', border: '1px solid rgba(226,232,240,0.8)', padding: '16px', minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData} margin={{ top: 20, right: 30, bottom: 40, left: 60 }}>
                                <defs>
                                    <linearGradient id="etchArea" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                                <XAxis
                                    dataKey="timeLabel"
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 10 }}
                                    label={{ value: '时间 t (ms)', position: 'insideBottomRight', offset: -5, fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    domain={[0, 'dataMax + 0.1']}
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11 }}
                                    label={{ value: 'ADC 采样值', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 10, offset: 15, fontWeight: 700 }}
                                />
                                <ChartTooltip
                                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.06)' }}
                                    formatter={(v) => [`${v} uA`, '电流值']}
                                />
                                <ReferenceLine y={THRESHOLD_VALUE} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: '阈值', position: 'right', fill: '#F59E0B', fontSize: 10 }} />
                                <Area type="monotone" dataKey="current" stroke="#4F46E5" strokeWidth={2.5} fill="url(#etchArea)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* 链路日志 */}
                <GlassCard title="链路日志" style={{ flex: 0.8, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <LinkLogPanel logs={logs} emptyText="等待数据流..." />
                    </div>
                </GlassCard>
            </div>

            {/* 右侧控制区 */}
            <div style={{ flex: '0.35', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '360px' }}>
                <GlassCard title="连接与通讯" subtitle="WebSocket 桥接设置">
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} size="small" placeholder="ws://接口地址..." style={{ flex: 1 }} />
                        <Button type="primary" size="small" onClick={connectWs} disabled={connectionState === 'connected'}>连接</Button>
                        <Button size="small" onClick={disconnectWs}>断开</Button>
                    </div>
                </GlassCard>

                <GlassCard title="波形发生器 (WFG)" subtitle="调控电压、频率与波形模式">
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Radio.Group value={wfType} onChange={(e) => setWfType(e.target.value)} size="small" buttonStyle="solid">
                                <Radio.Button value="SINE">正弦波</Radio.Button>
                                <Radio.Button value="SQUARE">方波</Radio.Button>
                                <Radio.Button value="PULSE">脉冲</Radio.Button>
                                <Radio.Button value="DC">直流</Radio.Button>
                            </Radio.Group>
                            <Select value={wfChannel} onChange={setWfChannel} size="small" style={{ width: '70px' }}>
                                <Select.Option value="C1">CH1</Select.Option>
                                <Select.Option value="C2">CH2</Select.Option>
                            </Select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>频率 (Hz)</div>
                                <InputNumber value={wfFreq} onChange={setWfFreq} size="small" style={{ width: '100%' }} disabled={wfType === 'DC'} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>幅值 (Vpp)</div>
                                <InputNumber value={wfAmp} onChange={setWfAmp} size="small" style={{ width: '100%' }} disabled={wfType === 'DC'} />
                            </div>
                        </div>

                        <Button size="small" block icon={<Activity size={12} />} onClick={applyWaveform}>下发波形参数</Button>

                        <Divider style={{ margin: '8px 0' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>高电平 (V)</div>
                                <InputNumber value={wfHlev} onChange={setWfHlev} size="small" style={{ width: '100%' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>低电平 (V)</div>
                                <InputNumber value={wfLlev} onChange={setWfLlev} size="small" style={{ width: '100%' }} />
                            </div>
                        </div>
                        <Button size="small" block ghost type="primary" style={{ color: '#4F46E5', borderColor: '#4F46E5' }} onClick={applyLevels}>更新电平配置 (H/L)</Button>
                    </div>
                </GlassCard>

                <GlassCard title="基础刻蚀参数" subtitle="设定深度与循环次数">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>深度 (DEPTH)</div>
                            <InputNumber value={depth} onChange={setDepth} size="small" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>时长 (TIME)</div>
                            <InputNumber value={duration} onChange={setDuration} size="small" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>次数 (COUNT)</div>
                            <InputNumber value={counts} onChange={setCounts} size="small" style={{ width: '100%' }} />
                        </div>
                    </div>
                    <Button block icon={<Zap size={14} />} type="primary" size="small" style={{ marginTop: '10px' }} onClick={() => sendFrame(buildRecipeFrame(depth, duration, counts, 0x03), 'ETCH')}>
                        下发刻蚀配方 (ARM+ETCH)
                    </Button>
                </GlassCard>

                <GlassCard title="执行面板" subtitle="手动控制与原始指令">
                    <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <Button size="small" icon={<Binary size={12} />} onClick={() => sendFrame(rawFrameInput, 'RAW')}>原始帧</Button>
                            <Button size="small" icon={<Command size={12} />} onClick={() => setCommandModalVisible(true)}>指令字典</Button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            <Button type="primary" size="small" icon={<Play size={12} />} onClick={() => sendFrame(buildRecipeFrame(depth, duration, counts, 0x03), '开始')}>开始</Button>
                            <Button size="small" icon={<Pause size={12} />} onClick={() => sendFrame('FF 00 00 00 00 00 04 FF', '暂停')}>暂停</Button>
                            <Button danger size="small" icon={<ShieldAlert size={12} />} onClick={() => sendFrame('FF 00 00 00 00 00 05 FF', '急停')}>急停</Button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0' }}>
                            <Button size="small" onClick={() => sendFrame('FF 00 00 00 01 00 05 FF', 'Z 轴 +')}>Z 轴 +</Button>
                            <Button size="small" onClick={() => sendFrame('FF 00 00 00 01 00 07 FF', '停止')}>停止</Button>
                            <Button size="small" onClick={() => sendFrame('FF 00 00 00 01 00 06 FF', 'Z 轴 -')}>Z 轴 -</Button>
                        </div>
                        <Input.TextArea value={rawFrameInput} onChange={(e) => setRawFrameInput(e.target.value)} size="small" autoSize={{ minRows: 1, maxRows: 1 }} style={{ fontSize: '10px' }} placeholder="FF 00 ..." />
                    </div>
                </GlassCard>
            </div>

            <Modal
                title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Command size={18} /> 完整指令字典</div>}
                open={commandModalVisible}
                onCancel={() => setCommandModalVisible(false)}
                footer={null}
                width={520}
                centered
            >
                <div style={{ display: 'grid', gap: '12px' }}>
                    {QUICK_COMMANDS.map(item => (
                        <Button key={item.label} block style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between' }} onClick={() => { sendFrame(`FF 00 00 00 01 00 ${item.cmd.toString(16).padStart(2, '0')} FF`, item.label); setCommandModalVisible(false); }}>
                            <span>{item.label}</span>
                            <Tag style={{ margin: 0 }}>0x{item.cmd.toString(16).toUpperCase().padStart(2, '0')}</Tag>
                        </Button>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
