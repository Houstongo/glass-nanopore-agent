import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Database, Upload, FileText, Trash2, Search, Loader2, Sparkles, Filter, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../constants/config';

const KnowledgeBase = ({ llmModel }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [query, setQuery] = useState('');
    const [queryResult, setQueryResult] = useState(null);
    const [queryLoading, setQueryLoading] = useState(false);
    const [activeLib, setActiveLib] = useState('core'); // 'core' or 'macro'
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'graph'
    const [kgData, setKgData] = useState({ nodes: [], links: [] });
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const fgRef = useRef();

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/rag/files`);
            setFiles(res.data.files || []);
        } catch (e) {
            console.error("Fetch files failed", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchKGData = async () => {
        try {
            const res = await axios.get(`${API_BASE}/rag/kg`);
            setKgData(res.data || { nodes: [], links: [] });
        } catch (e) {
            console.error("Fetch KG failed", e);
        }
    };

    useEffect(() => {
        fetchFiles();
        fetchKGData();
    }, []);

    const handleFileUpload = async (e) => {
        const selectedFiles = e.target.files || e.dataTransfer.files;
        if (!selectedFiles.length) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFiles[0]);
        formData.append('target_lib', activeLib);

        try {
            await axios.post(`${API_BASE}/rag/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchFiles();
        } catch (e) {
            alert("文件上传或索引失败: " + (e.response?.data?.detail || e.message));
        } finally {
            setUploading(false);
        }
    };

    const deleteFile = async (filename) => {
        if (!confirm(`确定要删除 ${filename} 吗？这会从知识库中移除相关索引。`)) return;
        try {
            await axios.delete(`${API_BASE}/rag/files/${filename}?target_lib=${activeLib}`);
            fetchFiles();
        } catch (e) {
            alert("删除失败");
        }
    };

    const handleQuery = async () => {
        if (!query.trim()) return;
        setQueryLoading(true);
        setQueryResult(null);
        try {
            const res = await axios.post(`${API_BASE}/rag/query`, {
                query,
                model: llmModel,
                target_lib: activeLib,
                top_k: 4
            });
            setQueryResult(res.data);
        } catch (e) {
            alert("检索失败: " + (e.response?.data?.detail || e.message));
        } finally {
            setQueryLoading(false);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', position: 'relative' }}>
            {/* 背景装饰 */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', gap: '24px', height: '100%', minHeight: 0 }}>
                {/* 左侧：文件管理与上传 */}
                <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={20} color="var(--primary)" /> 知识库源
                            </h2>
                            <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <button
                                    onClick={() => setActiveLib('core')}
                                    style={{
                                        padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        fontSize: '11px', fontWeight: 600,
                                        background: activeLib === 'core' ? '#fff' : 'transparent',
                                        color: activeLib === 'core' ? 'var(--primary)' : '#64748B',
                                        boxShadow: activeLib === 'core' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}>核心库</button>
                                <button
                                    onClick={() => setActiveLib('macro')}
                                    style={{
                                        padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        fontSize: '11px', fontWeight: 600,
                                        background: activeLib === 'macro' ? '#fff' : 'transparent',
                                        color: activeLib === 'macro' ? 'var(--primary)' : '#64748B',
                                        boxShadow: activeLib === 'macro' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                    }}>灵感库</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 600, background: viewMode === 'list' ? 'var(--primary)' : '#fff', color: viewMode === 'list' ? '#fff' : '#64748B', cursor: 'pointer' }}
                            >
                                文档列表
                            </button>
                            <button
                                onClick={() => { setViewMode('graph'); fetchKGData(); }}
                                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 600, background: viewMode === 'graph' ? 'var(--primary)' : '#fff', color: viewMode === 'graph' ? '#fff' : '#64748B', cursor: 'pointer' }}
                            >
                                知识图谱
                            </button>
                        </div>

                        <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                            {activeLib === 'core' ? '上传实验方案、严谨工艺参数 PDF。AI 将以此为准进行高精度计算。' : '上传前沿论文、背景知识。AI 将从中提取灵感，辅助跨学科探索。'}
                        </p>

                        {/* 上传区 */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e); }}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: dragActive ? '2px dashed var(--primary)' : '2px dashed #E2E8F0',
                                borderRadius: '12px', padding: '32px 20px', textAlign: 'center',
                                background: dragActive ? 'rgba(99,102,241,0.02)' : '#F8FAFC',
                                cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                            }}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.txt,.md" />
                            {uploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <Loader2 size={32} className="spin" color="var(--primary)" />
                                    <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>正在解析并构建向量索引...</span>
                                </div>
                            ) : (
                                <>
                                    <Upload size={32} color={dragActive ? "var(--primary)" : "#94A3B8"} style={{ marginBottom: '12px' }} />
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>点击或拖拽文件到此处</div>
                                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>支持 PDF, Markdown, TXT</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 文件列表 / 知识图谱预览 */}
                    <div className="glass-card" style={{ flex: 1, padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {viewMode === 'list' ? (
                            <>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 800, fontSize: '14px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} /> 已索引文档 ({files.length})
                                </div>
                                <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
                                    {loading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spin" color="#CBD5E1" /></div>
                                    ) : files.length === 0 ? (
                                        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>暂无文档，请先上传</div>
                                    ) : (
                                        files.map(file => (
                                            <div key={file.name} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 10px',
                                                borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s',
                                                justifyContent: 'space-between'
                                            }} className="file-item-hover">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                    <div style={{ width: '32px', height: '32px', background: '#EEF2FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{formatSize(file.size)} • {new Date(file.mtime * 1000).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteFile(file.name)}
                                                    style={{ background: 'none', border: 'none', color: '#CBD5E1', padding: '8px', cursor: 'pointer', transition: 'color 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                                    onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, background: '#0F172A', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, color: '#fff', fontSize: '10px', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                                    实体关系分布图 (Knowledge Graph)
                                </div>
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '12px' }}>
                                    {/* 这里占位，稍后如果是生产环境需要 npm install react-force-graph-2d */}
                                    {kgData.nodes.length > 0 ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ color: '#6366F1', fontWeight: 800, fontSize: '18px' }}>{kgData.nodes.length}</div>
                                            <div>Entities Detected</div>
                                            <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.6 }}>Interactive Graph Rendering...</div>
                                        </div>
                                    ) : (
                                        "上传文件以提取知识图谱"
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧：语义检索测试区 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-card" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Search size={22} color="var(--primary)" /> 语义分析检索
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '14px' }}>基于向量索引进行多步检索与合成，验证知识库的专业性能。</p>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                                placeholder="输入具体实验问题，例如：'如何优化 300mM KCl 下的刻蚀流速？'"
                                style={{
                                    width: '100%', padding: '16px 60px 16px 20px', borderRadius: '14px',
                                    border: '1px solid #E2E8F0', background: '#F8FAFC', outline: 'none',
                                    fontSize: '15px', color: '#1E293B', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                }}
                            />
                            <button
                                onClick={handleQuery}
                                disabled={queryLoading || !query.trim()}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                    background: query.trim() ? 'var(--primary)' : '#E2E8F0',
                                    border: 'none', color: '#fff', padding: '10px', borderRadius: '10px',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                {queryLoading ? <Loader2 size={20} className="spin" /> : <Search size={20} />}
                            </button>
                        </div>

                        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                            <AnimatePresence mode="wait">
                                {queryLoading ? (
                                    <motion.div
                                        key="searching"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}
                                    >
                                        <div style={{ width: '200px', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                                            <motion.div
                                                animate={{ x: [-200, 200] }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                style={{ width: '40px', height: '100%', background: 'var(--primary)' }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sparkles size={14} color="var(--primary)" /> 正在根据检索片段合成结论...
                                        </div>
                                    </motion.div>
                                ) : queryResult ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                                    >
                                        {/* 核心回答 */}
                                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
                                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <CheckCircle2 size={14} /> AI 综合分析结论
                                            </div>
                                            <div style={{ fontSize: '15px', color: '#1E293B', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                                {queryResult.answer}
                                            </div>
                                        </div>

                                        {/* 引用片段 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Filter size={14} /> 检索依据 (Top-K)
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                                {queryResult.retrieved_chunks?.map((chunk, i) => (
                                                    <div key={i} style={{ padding: '12px', background: '#fff', border: '1px solid #F1F5F9', borderRadius: '10px', fontSize: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#64748B' }}>
                                                            <div style={{ width: '18px', height: '18px', background: '#F1F5F9', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{i + 1}</div>
                                                            <span style={{ fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chunk.metadata?.source_file || 'Unknown Source'}</span>
                                                        </div>
                                                        <div style={{ color: '#475569', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                                                            {chunk.page_content}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 消耗统计 */}
                                        {queryResult.usage && (
                                            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>消耗：<b>{queryResult.usage.total_tokens}</b> tokens</div>
                                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>模型：<b>{llmModel}</b></div>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', opacity: 0.3, color: '#64748B' }}>
                                        <Search size={48} strokeWidth={1} style={{ marginBottom: '16px' }} />
                                        <div style={{ fontSize: '14px' }}>输入问题并回车进行深度检索</div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* 下方提示卡 */}
                    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#3730A3' }}>
                        <Info size={18} style={{ marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                            <b>技巧:</b> 实验前，请确保至少上传了一份包含对应实验参数的 PDF 文档。AI 的建议将遵循“本地检索优先”原则，
                            如果检索不到相关数据，AI 将基于模型通用知识尝试回答，但会标注“非确切数据库来源”。
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .file-item-hover:hover { background: #F8FAFC; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default KnowledgeBase;
