import React, { useState } from 'react';
import EtchingConsole from './pages/EtchingConsole';
import KnowledgeBase from './pages/KnowledgeBase';
import CleaningSystem from './pages/CleaningSystem';
import PoreMeasurement from './pages/PoreMeasurement';
import EtchingDatabase from './pages/EtchingDatabase';
import {
    Layout,
    Database,
    Settings,
    Zap,
    Droplets,
    BarChart3,
    GitBranch,
    Terminal,
    Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock components for modules under development
const WorkflowOrchestrator = () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748B' }}>
        <GitBranch size={64} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5, color: '#818CF8' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E293B' }}>Coze 实验编排空间</h2>
        <p style={{ fontSize: '14px' }}>拖拽仪器模块，定义全自动制备逻辑流水线</p>
    </div>
);

const App = () => {
    const [activePage, setActivePage] = useState('etching');
    const [llmModel, setLlmModel] = useState('glm-4-flash');

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
        <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* 极客风格侧边栏 */}
            <aside style={{
                width: '80px',
                background: '#0F172A',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '24px 0',
                gap: '12px',
                zIndex: 100,
                boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                }}>
                    <Monitor color="#fff" size={28} />
                </div>

                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        style={{
                            background: 'none', border: 'none', padding: '12px', borderRadius: '16px',
                            color: activePage === item.id ? '#fff' : '#64748B',
                            backgroundColor: activePage === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title={item.name || item.label}
                        onMouseEnter={e => !(activePage === item.id) && (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={e => !(activePage === item.id) && (e.currentTarget.style.color = '#64748B')}
                    >
                        <item.icon size={22} color={activePage === item.id ? item.color : 'currentColor'} />
                        {activePage === item.id && (
                            <motion.div
                                layoutId="nav-active"
                                style={{ position: 'absolute', right: '-12px', width: '4px', height: '24px', background: item.color, borderRadius: '4px 0 0 4px', boxShadow: `0 0 10px ${item.color}` }}
                            />
                        )}
                    </button>
                ))}
            </aside>

            {/* 主内容区 */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {/* 背景磨砂效果 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '400px', background: 'radial-gradient(circle at 50% -20%, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

                <header style={{
                    height: '64px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 32px',
                    justifyContent: 'space-between',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
                            NANOLAB <span style={{ color: '#6366F1', fontWeight: 500 }}>AGENT OS</span>
                        </h1>
                        <div style={{ height: '20px', width: '1px', background: '#CBD5E1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{navItems.find(i => i.id === activePage)?.name || navItems.find(i => i.id === activePage)?.label}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F1F5F9', padding: '6px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                            <Zap size={14} color="#F59E0B" fill="#F59E0B" />
                            <select
                                value={llmModel}
                                onChange={(e) => setLlmModel(e.target.value)}
                                style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 700, outline: 'none', cursor: 'pointer', color: '#1E293B' }}
                            >
                                <option value="glm-4-flash">GLM-4 Flash</option>
                                <option value="glm-4-plus">GLM-4 Plus</option>
                                <option value="deepseek-chat">DeepSeek Chat</option>
                            </select>
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
                                <EtchingConsole llmModel={llmModel} />
                            ) : activePage === 'knowledge' ? (
                                <KnowledgeBase llmModel={llmModel} />
                            ) : activePage === 'cleaning' ? (
                                <CleaningSystem />
                            ) : activePage === 'measuring' ? (
                                <PoreMeasurement />
                            ) : activePage === 'database' ? (
                                <EtchingDatabase />
                            ) : activePage === 'workflow' ? (
                                <WorkflowOrchestrator />
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
        </div>
    );
};

export default App;

