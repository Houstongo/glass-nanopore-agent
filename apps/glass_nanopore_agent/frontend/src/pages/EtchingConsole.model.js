export const DEFAULT_PHASES = [
    { id: 'idle', label: '待机', start: 0, end: 8, color: '#CBD5E1' },
    { id: 'armed', label: '就绪', start: 8, end: 18, color: '#818CF8' },
    { id: 'contact', label: '接触', start: 18, end: 28, color: '#22C55E' },
    { id: 'etching', label: '刻蚀', start: 28, end: 78, color: '#6366F1' },
    { id: 'retreat', label: '回退', start: 78, end: 92, color: '#F59E0B' },
    { id: 'done', label: '完成', start: 92, end: 100, color: '#10B981' },
];

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function getPhaseForProgress(progress, phases = DEFAULT_PHASES) {
    const normalized = clamp(progress, 0, 100);
    return phases.find((phase) => normalized >= phase.start && normalized <= phase.end) || phases[0];
}

export function buildMockTrace(pointCount = 120, phases = DEFAULT_PHASES) {
    return Array.from({ length: pointCount }, (_, index) => {
        const progress = pointCount <= 1 ? 100 : (index / (pointCount - 1)) * 100;
        const phase = getPhaseForProgress(progress, phases);
        const baselineByPhase = {
            idle: 0.12,
            armed: 0.18,
            contact: 0.34,
            etching: 0.58,
            retreat: 0.28,
            done: 0.14,
        };
        const ripple = Math.sin(index / 5) * 0.045 + Math.cos(index / 9) * 0.02;
        const current = Number((baselineByPhase[phase.id] + ripple + (phase.id === 'etching' ? 0.06 : 0)).toFixed(3));

        return {
            index,
            progress: Number(progress.toFixed(2)),
            timeLabel: `T+${String(index).padStart(3, '0')}ms`,
            current,
            threshold: 0.46,
            phaseId: phase.id,
            phaseLabel: phase.label,
            packetSeq: 1000 + index,
            dropCount: phase.id === 'etching' && index % 37 === 0 ? 1 : 0,
        };
    });
}

export function buildControlEvents() {
    return [
        { id: 'cmd-arm', label: '预备 (ARM)', progress: 10, tone: 'command' },
        { id: 'cmd-contact', label: '偏置 (BIAS)', progress: 24, tone: 'command' },
        { id: 'cmd-etch', label: '刻蚀 (ETCH)', progress: 34, tone: 'command' },
        { id: 'cmd-retreat', label: '回退 (LIFT)', progress: 80, tone: 'command' },
    ];
}

export function buildSystemEvents() {
    return [
        { id: 'evt-link', label: '链路稳定', progress: 6, tone: 'info' },
        { id: 'evt-contact', label: '检测到接触', progress: 22, tone: 'success' },
        { id: 'evt-threshold', label: '阈值穿越', progress: 43, tone: 'warning' },
        { id: 'evt-complete', label: '周期完成', progress: 94, tone: 'success' },
    ];
}

export function pickNearestTraceIndex(trace, progress) {
    if (!trace.length) return 0;
    const normalized = clamp(progress, 0, 100);
    let bestIndex = 0;
    let bestDistance = Infinity;

    trace.forEach((item, index) => {
        const distance = Math.abs(item.progress - normalized);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });

    return bestIndex;
}
