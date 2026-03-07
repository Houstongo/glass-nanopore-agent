import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Table, ChevronLeft, ChevronRight, Search, Filter, ArrowUpDown,
    Image as ImageIcon, FileSpreadsheet, Loader2, Maximize2, ExternalLink,
    Activity, Zap, Target, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../constants/config';
import { formatAngleDiff } from './EtchingDatabase.helpers';

const EtchingDatabase = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(8);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [order, setOrder] = useState('desc');
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/database/experiments`, {
                params: { page, page_size: pageSize, sort_by: sortBy, order }
            });
            setData(res.data.data);
            setTotal(res.data.total);
        } catch (e) {
            console.error("Fetch database failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, sortBy, order]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setOrder(order === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setOrder('desc');
        }
    };

    const API_HOST = API_BASE.replace('/api', '');

    const StatCard = ({ icon: Icon, label, value, unit, color }) => (
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ padding: '10px', background: `${color}15`, borderRadius: '10px', color: color }}>
                <Icon size={20} />
            </div>
            <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#1E293B' }}>{value} <span style={{ fontSize: '12px', fontWeight: 500 }}>{unit}</span></div>
            </div>
        </div>
    );

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '24px', overflow: 'hidden', background: '#F8FAFC' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.5px' }}>
                        玻璃纳米电刻蚀全生命周期数据库
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>整合 L0 执行参数与 L2 视觉质量评价的闭环实验记录</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
                        <input
                            placeholder="搜索批次、标签或质量等级..."
                            style={{
                                padding: '12px 16px 12px 40px', borderRadius: '12px', border: '1px solid #E2E8F0',
                                background: '#fff', fontSize: '13px', width: '280px', outline: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '20px' }}>
                <StatCard icon={Activity} label="总测量组数" value={total} unit="组" color="#6366F1" />
                <StatCard icon={Zap} label="典型正电压" value="5.0" unit="V" color="#F59E0B" />
                <StatCard icon={Target} label="平均角度误差" value="1.2" unit="°" color="#10B981" />
                <StatCard icon={Award} label="优质率 (A级)" value="82" unit="%" color="#EC4899" />
            </div>

            {/* Main Table Area */}
            <div className="glass-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0' }}>
                <div style={{ flex: 1, overflow: 'auto' }} className="custom-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '2px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <tr>
                                {[
                                    { key: 'id', label: 'ID', width: '70px' },
                                    { key: 'run_label', label: '实验标签', width: '160px' },
                                    { key: 'params', label: '工艺参数 (V/Hz)', width: '180px' },
                                    { key: 'angles', label: '锥角 (Target/Actual)', width: '200px' },
                                    { key: 'quality_score', label: '质量评分', width: '120px' },
                                    { key: 'status', label: '执行状态', width: '100px' },
                                    { key: 'main_image', label: '显微形貌 (SEM)', width: '180px' },
                                    { key: 'actions', label: '详情', width: '80px' }
                                ].map(col => (
                                    <th
                                        key={col.key}
                                        onClick={() => !['params', 'angles', 'main_image', 'actions'].includes(col.key) && handleSort(col.key)}
                                        style={{
                                            padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B',
                                            cursor: !['params', 'angles', 'main_image', 'actions'].includes(col.key) ? 'pointer' : 'default',
                                            width: col.width
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {col.label}
                                            {!['params', 'angles', 'main_image', 'actions'].includes(col.key) && <ArrowUpDown size={12} opacity={sortBy === col.key ? 1 : 0.2} />}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="spin" size={32} color="var(--primary)" /></td></tr>
                            ) : data.map((item, idx) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                    key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }} className="row-hover"
                                >
                                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>#{item.id}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ background: '#EEF2FF', color: '#4338CA', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900, display: 'inline-block' }}>
                                            {item.run_label || 'TEST_RUN'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{item.positive_voltage_v}V / {item.negative_voltage_v}V</div>
                                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Frequency: {item.frequency_hz} Hz</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#94A3B8' }}>{item.target_angle_deg}°</span>
                                            <span style={{ color: '#1E293B', fontWeight: 800 }}>→ {item.actual_angle_deg}°</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: Math.abs(item.angle_diff_deg ?? 0) > 1.5 ? '#F43F5E' : '#10B981', fontWeight: 600 }}>
                                            Error: {formatAngleDiff(item.angle_diff_deg)}°
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ height: '6px', width: '40px', background: '#E2E8F0', borderRadius: '3px' }}>
                                                <div style={{ height: '100%', width: `${item.quality_score * 10}%`, background: item.quality_score > 8 ? '#10B981' : '#F59E0B', borderRadius: '3px' }} />
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: 800 }}>{item.quality_score}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 900,
                                            background: item.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                                            color: item.status === 'active' ? '#166534' : '#64748B',
                                            textTransform: 'uppercase'
                                        }}>{item.status}</span>
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                        {item.main_image_url ? (
                                            <div
                                                onClick={() => setSelectedImage(API_HOST + item.main_image_url)}
                                                className="img-container"
                                                style={{
                                                    width: '140px', height: '70px', borderRadius: '10px', overflow: 'hidden',
                                                    background: '#eee', cursor: 'pointer', position: 'relative', border: '1px solid #E2E8F0'
                                                }}
                                            >
                                                <img src={API_HOST + item.main_image_url} alt="SEM" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}>
                                                    <Maximize2 size={16} color="#fff" />
                                                </div>
                                            </div>
                                        ) : <div style={{ color: '#CBD5E1', fontSize: '11px' }}>NO IMAGE</div>}
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <button style={{ color: '#6366F1', cursor: 'pointer', border: 'none', background: 'transparent' }}><ExternalLink size={18} /></button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <footer style={{ padding: '20px 24px', borderTop: '1px solid #E2E8F0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>显示 <b>{total}</b> 条实验记录中的第 <b>{(page - 1) * pageSize + 1}</b> - <b>{Math.min(page * pageSize, total)}</b> 条</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-btn"><ChevronLeft size={18} /></button>
                        {[...Array(Math.min(5, Math.ceil(total / pageSize)))].map((_, i) => {
                            let p = i + 1;
                            if (Math.ceil(total / pageSize) > 5 && page > 3) p = page - 3 + i;
                            if (p > Math.ceil(total / pageSize)) return null;
                            return (
                                <button key={p} onClick={() => setPage(p)} className={`p-btn ${page === p ? 'active' : ''}`}>{p}</button>
                            );
                        })}
                        <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)} className="p-btn"><ChevronRight size={18} /></button>
                    </div>
                </footer>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', backdropFilter: 'blur(10px)' }}
                    >
                        <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={selectedImage} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} />
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .row-hover:hover { background: #F8FAFC; }
                .img-container:hover .img-overlay { opacity: 1 !important; }
                .p-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #E2E8F0; background: #fff; cursor: pointer; color: #64748B; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .p-btn:hover:not(:disabled) { border-color: #6366F1; color: #6366F1; }
                .p-btn.active { background: #6366F1; color: #fff; border-color: #6366F1; }
                .p-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default EtchingDatabase;
