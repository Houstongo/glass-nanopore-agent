import React, { useState, useEffect } from 'react';
import { API_BASE } from './constants/config';
import EtchingConsole from './pages/EtchingConsole';
import KnowledgeBase from './pages/KnowledgeBase';
import CleaningSystem from './pages/CleaningSystem';
import PoreMeasurement from './pages/PoreMeasurement';
import EtchingDatabase from './pages/EtchingDatabase';
import ErrorBoundary from './components/ErrorBoundary';
import {
    Database,
    Settings,
    Zap,
    Droplets,
    BarChart3,
    GitBranch,
    Terminal,
    Monitor,
    X,
    SlidersHorizontal,
    ChevronRight,
    Eye,
    EyeOff,
    Wifi,
    WifiOff,
    CheckCircle2,
    AlertCircle,
    PanelLeftClose,
    PanelLeftOpen,
    Cpu,
    Menu,
    Search as SearchIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigProvider, theme, Modal, Button, Select, Input, Tag, Space, message, Badge } from 'antd';

// Mock components for modules under development
const WorkflowOrchestrator = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748B' }}>
        <GitBranch size={64} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5, color: '#818CF8' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E293B' }}>Coze 实验编排空间</h2>
        <p style={{ fontSize: '14px' }}>拖拽仪器模块，定义全自动制备逻辑流水线</p>
    </div>
);

// 各 provider 可用模型列表（与后端 default_model_map 对齐）
const PROVIDER_MODELS = {
    ZhipuAI: [
        'glm-4-flash',        // 免费高速
        'glm-4-flash-250414', // 新版 Flash
        'glm-4-plus',         // 高性能
        'glm-4-long',         // 长上下文
        'glm-4-air',          // 轻量
        'glm-4-airx',         // 极速推理
        'glm-4-0520',         // 稳定版
        'glm-4',              // 旗舰
        'glm-4.7',            // 新一代
        'glm-4.7v',           // 视觉理解
        'glm-z1-flash',       // 深度推理 Flash
        'glm-z1-air',         // 深度推理 Air
    ],
    DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
    VolcEngine: [],
    Custom: [],
};

const PROVIDER_LABELS = {
    ZhipuAI: 'ZhipuAI',
    DeepSeek: 'DeepSeek',
    VolcEngine: '火山方舟',
    Custom: 'Custom',
};

// 各 provider 无预设列表时的默认模型名
const PROVIDER_DEFAULT_MODELS = {
    VolcEngine: 'ep-20260308033825-46h9r',
    Custom: '',
};

// 所有可选 provider
const ALL_PROVIDERS = ['ZhipuAI', 'DeepSeek', 'VolcEngine', 'Custom'];

// 各 provider 对应的 key 字段名（与后端 ConfigInitRequest 字段对齐）
const PROVIDER_KEY_FIELD = {
    ZhipuAI: 'zhipu_api_key',
    DeepSeek: 'deepseek_api_key',
    VolcEngine: 'volc_api_key',
    Custom: 'api_key',
};

/* ── 通用输入框样式 ── */
const inputStyle = (focused) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', borderRadius: '10px',
    border: `2px solid ${focused ? '#6366F1' : '#E2E8F0'}`,
    fontSize: '13px', color: '#1E293B', outline: 'none',
    fontFamily: 'monospace', background: '#FAFAFA',
    transition: 'border-color 0.15s',
});

/* ── 模型设置 Modal ── */
const ModelSettingsModal = ({ open, onClose, provider, model, onApply }) => {
    const [draftProvider, setDraftProvider] = useState(provider);
    const [draftModel, setDraftModel] = useState(model);
    const [draftKey, setDraftKey] = useState('');
    const [keyFocused, setKeyFocused] = useState(false);
    const [keyVisible, setKeyVisible] = useState(false);  // Key 明文/密文切换
    const [modelFocused, setModelFocused] = useState(false);
    // 验证状态：idle | loading | ok | error
    const [validateState, setValidateState] = useState('idle');
    const [validateMsg, setValidateMsg] = useState('');

    // 切换 provider：重置 model 和 key
    const handleProviderChange = (p) => {
        setDraftProvider(p);
        setValidateState('idle');
        const presets = PROVIDER_MODELS[p] || [];
        setDraftModel(presets.length > 0 ? presets[0] : (PROVIDER_DEFAULT_MODELS[p] ?? ''));
        // 从后端缓存的 allKeys 中切换对应 key
        setDraftKey(allKeysRef.current[PROVIDER_KEY_FIELD[p]] || '');
    };

    // 用 ref 缓存从后端加载的全部 key，方便切换 provider 时取用
    const allKeysRef = React.useRef({});

    // 打开时：从后端加载配置并初始化各字段
    useEffect(() => {
        if (!open) return;
        setDraftProvider(provider);
        setDraftModel(model);
        setValidateState('idle');
        setValidateMsg('');
        fetch(`${API_BASE}/config`)
            .then(r => r.json())
            .then(data => {
                allKeysRef.current = {
                    zhipu_api_key: data.zhipu_api_key || '',
                    deepseek_api_key: data.deepseek_api_key || '',
                    volc_api_key: data.volc_api_key || '',
                    api_key: data.api_key || '',
                };
                setDraftKey(allKeysRef.current[PROVIDER_KEY_FIELD[provider]] || '');
            })
            .catch(() => setDraftKey(''));
    }, [open, provider, model]);

    // 验证并应用
    const handleApply = async () => {
        if (!draftKey.trim()) {
            setValidateState('error');
            setValidateMsg('请填写 API Key');
            return;
        }
        setValidateState('loading');
        setValidateMsg('');
        try {
            const body = {
                llm_provider: draftProvider,
                selected_model: draftModel,
                [PROVIDER_KEY_FIELD[draftProvider]]: draftKey.trim(),
            };
            const res = await fetch(`${API_BASE}/config/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                const detail = data.detail || data.validation?.llm?.message || '验证失败';
                setValidateState('error');
                setValidateMsg(typeof detail === 'string' ? detail : (detail.message || JSON.stringify(detail)));
            } else {
                setValidateState('ok');
                setValidateMsg(data.validation?.llm?.message || '连接成功');
                setTimeout(() => {
                    onApply(draftProvider, draftModel);
                    onClose();
                }, 800);
            }
        } catch {
            setValidateState('error');
            setValidateMsg('无法连接后端，请确认服务已启动');
        }
    };

    const modelList = PROVIDER_MODELS[draftProvider] || [];
    const hasPresets = modelList.length > 0;

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SlidersHorizontal size={16} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>模型适配器</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>LLM Provider & Model Selection</div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={480}
            centered
            styles={{ body: { padding: '20px 0 0' } }}
        >
            {/* Provider 选择 */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: '10px' }}>LLM PROVIDER</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {ALL_PROVIDERS.map(p => (
                        <Button
                            key={p}
                            onClick={() => handleProviderChange(p)}
                            type={draftProvider === p ? 'primary' : 'default'}
                            style={{
                                height: '40px',
                                borderRadius: '10px',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontWeight: 700
                            }}
                        >
                            {PROVIDER_LABELS[p]}
                            {draftProvider === p && <ChevronRight size={14} />}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Model 选择 */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: '8px' }}>MODEL</div>
                {hasPresets ? (
                    <Select
                        value={draftModel}
                        onChange={val => { setDraftModel(val); setValidateState('idle'); }}
                        style={{ width: '100%', height: '40px' }}
                        options={modelList.map(m => ({ label: m, value: m }))}
                    />
                ) : (
                    <Input
                        value={draftModel}
                        onChange={e => { setDraftModel(e.target.value); setValidateState('idle'); }}
                        placeholder={draftProvider === 'VolcEngine' ? 'ep-20260308033825-46h9r' : '自定义模型名'}
                        style={{ height: '40px', borderRadius: '10px' }}
                    />
                )}
            </div>

            {/* API Key 输入 */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    API KEY <span style={{ fontWeight: 400, color: '#CBD5E1' }}>— {PROVIDER_LABELS[draftProvider]}</span>
                </div>
                <Input.Password
                    value={draftKey}
                    onChange={e => { setDraftKey(e.target.value); setValidateState('idle'); }}
                    placeholder="已加密保存，修改后重新验证"
                    style={{ height: '40px', borderRadius: '10px' }}
                />
            </div>

            {/* 验证结果提示 */}
            {(validateState === 'error' || validateState === 'ok') && (
                <div style={{
                    marginBottom: '20px', padding: '10px 14px', borderRadius: '10px',
                    background: validateState === 'ok' ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${validateState === 'ok' ? '#BBF7D0' : '#FECACA'}`,
                    fontSize: '12px', fontWeight: 500,
                    color: validateState === 'ok' ? '#16A34A' : '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {validateState === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {validateMsg}
                </div>
            )}

            {/* 底部按钮 */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button onClick={onClose} disabled={validateState === 'loading'} style={{ borderRadius: '8px' }}>取消</Button>
                <Button
                    type="primary"
                    onClick={handleApply}
                    loading={validateState === 'loading'}
                    disabled={validateState === 'ok' || !draftModel || !draftKey.trim()}
                    style={{
                        borderRadius: '8px',
                        background: validateState === 'ok' ? '#10B981' : undefined,
                        borderColor: validateState === 'ok' ? '#10B981' : undefined,
                        fontWeight: 700
                    }}
                >
                    {validateState === 'ok' ? '已应用 ✓' : '验证并应用'}
                </Button>
            </div>
        </Modal>
    );
};

/* ── 主应用 ── */
const App = () => {
    const [activePage, setActivePage] = useState('etching');
    const [llmProvider, setLlmProvider] = useState('ZhipuAI');
    const [llmModel, setLlmModel] = useState('glm-4-flash');
    const [modelModalOpen, setModelModalOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // API 连通状态：'unknown' | 'ok' | 'error'
    const [apiStatus, setApiStatus] = useState('unknown');

    // 启动时从后端加载当前配置，并判断连通状态
    useEffect(() => {
        fetch(`${API_BASE}/config`)
            .then(r => r.json())
            .then(data => {
                const provider = data.llm_provider || 'ZhipuAI';
                const model = data.selected_model || data.llm_model || 'glm-4-flash';
                setLlmProvider(provider);
                setLlmModel(model);
                // is_initialized 表示 RAG 引擎已就绪（即 API Key 已配置并验证过）
                setApiStatus(data.is_initialized ? 'ok' : 'error');
            })
            .catch(() => setApiStatus('error'));
    }, []);

    const handleApplyModel = (provider, model) => {
        setLlmProvider(provider);
        setLlmModel(model);
        setApiStatus('ok');  // 验证通过后标记为连通
    };

    const navItems = [
        { id: 'etching', name: '纳米刻蚀控制台', icon: Zap, color: '#F59E0B' },
        { id: 'knowledge', name: 'RAG 知识库管理', icon: Database, color: '#6366F1' },
        { id: 'cleaning', label: '纳米孔清洗系统', icon: Droplets, color: '#0EA5E9' },
        { id: 'measuring', label: '纳米孔径测量仪', icon: BarChart3, color: '#10B981' },
        { id: 'database', label: '刻蚀数据库', icon: Database, color: '#F59E0B' },
        { id: 'workflow', label: '实验室编排 (Coze)', icon: GitBranch, color: '#818CF8' },
        { id: 'tools', name: '智能体系统工具', icon: Terminal, color: '#64748B' },
        { id: 'settings', name: '系统偏好设置', icon: Settings, color: '#475569' },
    ];

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#6366F1',
                    borderRadius: 12,
                    fontFamily: 'Inter, system-ui, sans-serif',
                },
                components: {
                    Button: {
                        fontWeight: 600,
                    },
                    Modal: {
                        titleFontSize: 16,
                        headerBg: '#FFFFFF',
                    }
                }
            }}
        >
            <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}>
                <motion.aside
                    initial={false}
                    animate={{ width: sidebarCollapsed ? 70 : 280 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{
                        background: '#e8edf5',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center', // 关键：容器层级居中
                        zIndex: 100,
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '16px 0' // 取消左右 padding
                    }}
                >
                    {/* 顶部工具栏 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', // 始终居中
                        width: '100%',
                        padding: sidebarCollapsed ? '0' : '0 24px',
                        marginBottom: '28px',
                        height: '40px'
                    }}>
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#444746',
                                transition: 'background 0.2s',
                                flexShrink: 0
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e1e5eb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <Menu size={24} />
                        </button>

                        <AnimatePresence>
                            {!sidebarCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -5 }}
                                    style={{
                                        marginLeft: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        overflow: 'hidden',
                                        flex: 1
                                    }}
                                >
                                    <span style={{
                                        fontSize: '15px',
                                        fontWeight: 900,
                                        letterSpacing: '0.02em',
                                        background: 'linear-gradient(90deg, #444746, #6366F1, #A855F7, #444746)',
                                        backgroundSize: '200% auto',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        animation: 'shine 4s linear infinite',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        LAB-OS AUTOMATION
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 导航项 */}
                    <nav style={{
                        width: '100%',
                        padding: sidebarCollapsed ? '0' : '0 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'center'
                    }}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActivePage(item.id)}
                                style={{
                                    background: activePage === item.id ? '#D3E3FD' : 'transparent',
                                    border: 'none',
                                    padding: sidebarCollapsed ? '0' : '12px 16px',
                                    borderRadius: sidebarCollapsed ? '50%' : '24px',
                                    color: activePage === item.id ? '#041e49' : '#444746',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    gap: sidebarCollapsed ? '0' : '16px',
                                    width: sidebarCollapsed ? '48px' : '100%',
                                    height: sidebarCollapsed ? '48px' : '48px',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                }}
                                onMouseEnter={e => {
                                    if (activePage !== item.id) e.currentTarget.style.background = '#e1e5eb';
                                }}
                                onMouseLeave={e => {
                                    if (activePage !== item.id) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <item.icon
                                    size={20}
                                    style={{
                                        minWidth: '20px',
                                        color: activePage === item.id ? '#0b57d0' : '#444746',
                                        flexShrink: 0
                                    }}
                                />
                                <AnimatePresence initial={false}>
                                    {!sidebarCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: activePage === item.id ? 600 : 500
                                            }}
                                        >
                                            {item.name || item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        ))}
                    </nav>

                    {/* 底部系统状态区 (浅色化处理) */}
                    <div style={{
                        marginTop: 'auto',
                        padding: '16px 0',
                        width: '100%',
                        borderTop: '1px solid #e1e5eb',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {/* API 状态 - 折叠态居中 */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                gap: '12px',
                                width: sidebarCollapsed ? '48px' : '100%',
                                padding: sidebarCollapsed ? '0' : '8px 24px',
                                borderRadius: '12px',
                                height: '40px'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {apiStatus === 'ok' ? (
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }} />
                                        <div className="ping" style={{ position: 'absolute', top: 0, left: 0, width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', opacity: 0.6 }} />
                                    </div>
                                ) : <WifiOff size={16} color="#DC2626" />}
                            </div>
                            {!sidebarCollapsed && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#444746', letterSpacing: '0.02em' }}>
                                        {apiStatus === 'ok' ? '系统在线' : '系统离线'}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* 模型状态 - 折叠态居中 */}
                        <div
                            onClick={() => setModelModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                gap: '12px',
                                width: sidebarCollapsed ? '48px' : '100%',
                                padding: sidebarCollapsed ? '0' : '8px 24px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                height: '40px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e1e5eb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: '20px', height: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <Cpu size={16} color="#0b57d0" />
                            </div>
                            {!sidebarCollapsed && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#444746', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {llmModel.toUpperCase()}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.aside>

                {/* 主内容区 */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                    {/* 背景磨砂效果 */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '400px', background: 'radial-gradient(circle at 50% -20%, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

                    <header style={{
                        height: '64px',
                        background: '#fff',
                        borderBottom: '1px solid #e1e5eb',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 32px',
                        justifyContent: 'space-between',
                        zIndex: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {React.createElement(navItems.find(i => i.id === activePage)?.icon || Zap, {
                                    size: 20,
                                    color: navItems.find(i => i.id === activePage)?.color || '#6366F1'
                                })}
                                <span style={{ fontSize: '15px', color: '#0F172A', fontWeight: 800, letterSpacing: '-0.01em' }}>
                                    {navItems.find(i => i.id === activePage)?.name || navItems.find(i => i.id === activePage)?.label}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                                <span style={{ color: '#CBD5E1' }}>V3.0.0-稳定版</span>
                            </div>
                        </div>
                    </header>

                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', zIndex: 5 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePage}
                                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                                transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                                style={{ flex: 1, display: 'flex' }}
                            >
                                {activePage === 'etching' ? (
                                    <ErrorBoundary><EtchingConsole llmModel={llmModel} /></ErrorBoundary>
                                ) : activePage === 'knowledge' ? (
                                    <ErrorBoundary><KnowledgeBase llmModel={llmModel} /></ErrorBoundary>
                                ) : activePage === 'cleaning' ? (
                                    <ErrorBoundary><CleaningSystem /></ErrorBoundary>
                                ) : activePage === 'measuring' ? (
                                    <ErrorBoundary><PoreMeasurement /></ErrorBoundary>
                                ) : activePage === 'database' ? (
                                    <ErrorBoundary><EtchingDatabase /></ErrorBoundary>
                                ) : activePage === 'workflow' ? (
                                    <ErrorBoundary><WorkflowOrchestrator /></ErrorBoundary>
                                ) : (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748B' }}>
                                        <Settings size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '14px' }}><b>模块开发中:</b> 当前 ({activePage}) 正在集成驱动协议...</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* 模型设置 Modal */}
                <ModelSettingsModal
                    open={modelModalOpen}
                    onClose={() => setModelModalOpen(false)}
                    provider={llmProvider}
                    model={llmModel}
                    onApply={handleApplyModel}
                />
            </div>
            <style>{`
                @keyframes shine {
                    to { background-position: 200% center; }
                }
                @keyframes ping {
                    75%, 100% { transform: scale(3); opacity: 0; }
                }
                .ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}</style>
        </ConfigProvider>
    );
};

export default App;
