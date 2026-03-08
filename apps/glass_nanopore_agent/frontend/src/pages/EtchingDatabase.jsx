import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Layers, Search, Filter, ChevronRight, ArrowUpDown,
    Database, Activity, Target, Zap, Waves, Beaker,
    Maximize2, Download, RefreshCw, BarChart3, Clock,
    LayoutGrid, List, Info, TrendingUp, X
} from 'lucide-react';
import { Table, Image, Tag, Input, Space, Button, Typography, Badge, InputNumber, Drawer, Statistic, Tooltip, ConfigProvider, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../constants/config';

const { Text, Title } = Typography;

const GlassCard = ({ children, style = {}, className = "" }) => (
    <div
        className={`glass-card ${className}`}
        style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            borderRadius: '16px',
            ...style
        }}
    >
        {children}
    </div>
);

const StatCard = ({ title, value, icon: Icon, color, suffix = "" }) => (
    <motion.div
        whileHover={{ translateY: -4 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ flex: 1 }}
    >
        <GlassCard style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Text style={{ color: '#64748B', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>{title}</Text>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <Title level={3} style={{ color: '#1E293B', margin: 0, letterSpacing: '-0.02em', fontWeight: 800 }}>{value}</Title>
                        {suffix && <Text style={{ color: '#94A3B8', fontSize: '12px', fontWeight: 500 }}>{suffix}</Text>}
                    </div>
                </div>
                <div style={{
                    background: `${color}10`,
                    padding: '10px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={20} color={color} />
                </div>
            </div>
        </GlassCard>
    </motion.div>
);

const EtchingDatabase = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [order, setOrder] = useState('desc');
    const [jumpPage, setJumpPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/database/experiments`, {
                params: { page, page_size: pageSize, sort_by: sortBy, order }
            });
            setData(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (e) {
            console.error("Fetch database failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, sortBy, order]);

    const handleJump = () => {
        const p = Math.max(1, Math.min(jumpPage, Math.ceil(total / pageSize)));
        setPage(p);
    };

    const handleRowClick = (record) => {
        setSelectedRecord(record);
        setDrawerVisible(true);
    };

    const API_HOST = API_BASE.replace('/api', '');

    const columns = [
        {
            title: '实验 UID', dataIndex: 'id', key: 'id', width: 100,
            render: id => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '16px', background: '#6366F1', borderRadius: '2px' }} />
                    <span style={{ fontFamily: 'monospace', color: '#818CF8', fontWeight: 600 }}>#{id}</span>
                </div>
            ),
            sorter: true
        },
        {
            title: '实验标签 & 状态', dataIndex: 'run_label', key: 'run_label', width: 220,
            render: (text, record) => (
                <div>
                    <Text strong style={{ color: '#1E293B', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {text || 'UNTITLED_RUN'}
                    </Text>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                        {record.quality_score > 0.8 ?
                            <Badge status="success" text={<span style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}>优质制备</span>} /> :
                            <Badge status="processing" text={<span style={{ fontSize: '10px', color: '#6366F1', fontWeight: 600 }}>实验完成</span>} />
                        }
                    </div>
                </div>
            ),
            sorter: true
        },
        {
            title: '正向电压 (V+)', dataIndex: 'positive_voltage_v', key: 'positive_voltage_v', width: 110,
            render: v => <span style={{ color: '#F59E0B', fontWeight: 700, fontFamily: 'monospace' }}>{v?.toFixed(1)}V</span>,
            sorter: true
        },
        {
            title: '反向电压 (V-)', dataIndex: 'negative_voltage_v', key: 'negative_voltage_v', width: 110,
            render: v => <span style={{ color: '#64748B', fontFamily: 'monospace' }}>{v?.toFixed(1)}V</span>,
            sorter: true
        },
        {
            title: '脉冲频率', dataIndex: 'frequency_hz', key: 'frequency_hz', width: 100,
            render: v => <span style={{ color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>{v?.toFixed(0)}Hz</span>,
            sorter: true
        },
        {
            title: '刻蚀深度', dataIndex: 'immersion_depth_um', key: 'immersion_depth_um', width: 100,
            render: v => <span style={{ color: '#0EA5E9', fontFamily: 'monospace', fontWeight: 600 }}>{v}μm</span>,
            sorter: true
        },
        {
            title: '实测角度', dataIndex: 'actual_angle_deg', key: 'actual_angle_deg', width: 100,
            render: v => <span style={{ color: '#EC4899', fontWeight: 800 }}>{v?.toFixed(1)}°</span>,
            sorter: true
        },
        {
            title: '目标偏差', dataIndex: 'angle_diff_deg', key: 'angle_diff_deg', width: 100,
            render: v => {
                const diff = v ?? 0;
                return (
                    <span style={{ color: Math.abs(diff) < 1.0 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}°
                    </span>
                );
            },
            sorter: true
        },
        {
            title: '稳定性', dataIndex: 'stability', key: 'stability', width: 100, align: 'center',
            render: s => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((s || 0) * 100, 100)}%` }}
                            style={{ height: '100%', background: '#6366F1' }}
                        />
                    </div>
                    <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 800, marginTop: '4px' }}>{s?.toFixed(3) || '--'}</span>
                </div>
            ),
            sorter: true
        },
        {
            title: 'SEM 预览', dataIndex: 'main_image_url', key: 'main_image_url', width: 100, align: 'center',
            render: url => url ? (
                <div style={{ position: 'relative', width: '60px', height: '34px', margin: '0 auto' }}>
                    <Image
                        src={API_HOST + url}
                        width={60}
                        height={34}
                        style={{ objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                        preview={{
                            mask: (
                                <div style={{ background: 'rgba(0,0,0,0.4)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}>
                                    <Maximize2 size={12} color="#fff" />
                                </div>
                            )
                        }}
                    />
                </div>
            ) : <Tag color="rgba(255,255,255,0.05)" style={{ color: '#475569', border: 'none' }}>NO DATA</Tag>
        },
        {
            title: '', key: 'action', width: 50, align: 'center',
            render: (record) => (
                <Button
                    type="text"
                    icon={<Info size={16} color="#94A3B8" />}
                    onClick={(e) => { e.stopPropagation(); handleRowClick(record); }}
                    className="action-btn"
                />
            )
        }
    ];

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#6366F1',
                    colorBgContainer: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 12,
                },
            }}
        >
            <div style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: '#F8FAFC',
                color: '#1E293B',
                padding: '24px 32px',
                position: 'relative'
            }}>
                {/* Background Glows */}
                <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(244, 114, 182, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

                {/* Header Section */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', zIndex: 10 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
                                <Database size={18} color="#fff" />
                            </div>
                            <Title level={4} style={{ color: '#1E293B', margin: 0, letterSpacing: '-0.02em', fontWeight: 800 }}>刻蚀制备数据库</Title>
                        </div>
                        <Text style={{ color: '#64748B', fontSize: '13px' }}>管理并追溯纳米通道制备的每一个微观细节</Text>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Input
                            size="large"
                            placeholder="搜索实验标签..."
                            prefix={<Search size={16} color="#94A3B8" />}
                            style={{
                                width: 280,
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                background: '#FFFFFF',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        />
                        <Button
                            size="large"
                            style={{
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                            icon={<Filter size={16} />}
                        >
                            筛选条件
                        </Button>
                        <Button
                            size="large"
                            type="primary"
                            style={{
                                borderRadius: '12px',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                            }}
                            icon={<TrendingUp size={16} />}
                        >
                            统计报告
                        </Button>
                    </div>
                </header>

                {/* Stats Bar */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', zIndex: 10 }}>
                    <StatCard title="总记录数" value={total} icon={Layers} color="#6366F1" />
                    <StatCard title="平均优质率" value="94.2" icon={Activity} color="#10B981" suffix="%" />
                    <StatCard title="目标达成度" value="0.82" icon={Target} color="#F472B6" suffix="MSE" />
                    <StatCard title="平均稳定性" value="0.912" icon={Activity} color="#F59E0B" />
                </div>

                {/* Main Content Area */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 10
                }}>
                    <GlassCard style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0' }}>
                        <Table
                            size="middle"
                            dataSource={data}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            pagination={false}
                            scroll={{ x: 1300, y: 'calc(100vh - 420px)' }}
                            className="premium-table"
                            onRow={(record) => ({
                                onClick: () => handleRowClick(record),
                            })}
                            onChange={(p, f, s) => {
                                if (s && s.field) {
                                    setSortBy(s.field);
                                    setOrder(s.order === 'ascend' ? 'asc' : 'desc');
                                }
                            }}
                        />

                        {/* Pagination Footer */}
                        <footer style={{
                            height: '56px',
                            padding: '0 24px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                            background: 'rgba(255,255,255,0.01)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <Text style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                                    显示 {Math.min(data.length, pageSize)} 条，共 {total} 条
                                </Text>
                                <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                <Space size={8}>
                                    <Text style={{ fontSize: '12px', color: '#64748B' }}>跳转至</Text>
                                    <InputNumber
                                        size="small"
                                        min={1}
                                        max={Math.ceil(total / pageSize)}
                                        value={jumpPage}
                                        onChange={v => setJumpPage(v)}
                                        onPressEnter={handleJump}
                                        style={{ width: 48, borderRadius: '6px' }}
                                    />
                                </Space>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Button
                                    icon={<ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />}
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    style={{ borderRadius: '8px' }}
                                />
                                <Text style={{ fontSize: '13px', fontWeight: 700, minWidth: '60px', textAlign: 'center' }}>
                                    <span style={{ color: '#6366F1' }}>{page}</span> / {Math.ceil(total / pageSize)}
                                </Text>
                                <Button
                                    icon={<ChevronRight size={18} />}
                                    disabled={page >= Math.ceil(total / pageSize)}
                                    onClick={() => setPage(p => p + 1)}
                                    style={{ borderRadius: '8px' }}
                                />
                            </div>
                        </footer>
                    </GlassCard>
                </div>

                {/* Detail Drawer */}
                <Drawer
                    title={null}
                    placement="right"
                    onClose={() => setDrawerVisible(false)}
                    open={drawerVisible}
                    width={500}
                    styles={{ body: { padding: 0, background: '#F8FAFC' }, header: { display: 'none' } }}
                    closable={false}
                >
                    {selectedRecord && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#1E293B' }}>
                            {/* Drawer Header */}
                            <div style={{ padding: '24px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Tag color="blue" style={{ marginBottom: '8px', border: 'none', background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontWeight: 600 }}>#UID {selectedRecord.id}</Tag>
                                        <Title level={4} style={{ color: '#1E293B', margin: 0, fontWeight: 800 }}>{selectedRecord.run_label || '实验详情'}</Title>
                                    </div>
                                    <Button type="text" icon={<X size={20} color="#64748B" />} onClick={() => setDrawerVisible(false)} />
                                </div>
                            </div>

                            {/* Drawer Content */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="custom-scroll">
                                <section style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', marginBottom: '16px' }}>SEM 显微构型图像</div>
                                    {selectedRecord.main_image_url ? (
                                        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                            <Image
                                                src={API_HOST + selectedRecord.main_image_url}
                                                width="100%"
                                                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ height: '200px', background: '#FFFFFF', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #CBD5E1' }}>
                                            <Text style={{ color: '#94A3B8' }}>暂无 SEM 图像数据</Text>
                                        </div>
                                    )}
                                </section>

                                <section style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', marginBottom: '16px' }}>制备参数矩阵 (PARAMETERS)</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {[
                                            { label: '正向电压 (V+)', value: `${selectedRecord.positive_voltage_v?.toFixed(2)} V`, icon: Zap, color: '#F59E0B' },
                                            { label: '反向电压 (V-)', value: `${selectedRecord.negative_voltage_v?.toFixed(2)} V`, icon: Zap, color: '#64748B' },
                                            { label: '脉冲频率', value: `${selectedRecord.frequency_hz} Hz`, icon: Activity, color: '#10B981' },
                                            { label: '浸入深度', value: `${selectedRecord.immersion_depth_um} μm`, icon: Waves, color: '#0EA5E9' },
                                            { label: '溶液浓度', value: `${selectedRecord.solution_concentration} M`, icon: Beaker, color: '#818CF8' },
                                            { label: '刻蚀用时', value: `${selectedRecord.etching_time_s} s`, icon: Clock, color: '#EC4899' }
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ padding: '12px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                    <item.icon size={12} color={item.color} />
                                                    <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>{item.label}</span>
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#1E293B', fontWeight: 800, fontFamily: 'monospace' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', letterSpacing: '0.1em', marginBottom: '16px' }}>测量结果 (MEASUREMENTS)</div>
                                    <div style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.05))', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#6366F1', fontWeight: 700, marginBottom: '4px' }}>ACTUAL ANGLE</div>
                                                <div style={{ fontSize: '20px', color: '#1E293B', fontWeight: 900 }}>{selectedRecord.actual_angle_deg?.toFixed(1)}°</div>
                                            </div>
                                            <div style={{ width: '1px', background: '#E2E8F0' }} />
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#6366F1', fontWeight: 700, marginBottom: '4px' }}>ERROR DIFF</div>
                                                <div style={{ fontSize: '20px', color: Math.abs(selectedRecord.angle_diff_deg) < 1.0 ? '#10B981' : '#EF4444', fontWeight: 900 }}>
                                                    {selectedRecord.angle_diff_deg > 0 ? '+' : ''}{selectedRecord.angle_diff_deg?.toFixed(2)}°
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Drawer Footer */}
                            <div style={{ padding: '24px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                                <Button block size="large" icon={<Download size={18} />} style={{ borderRadius: '12px' }}>导出数据</Button>
                                <Button block size="large" type="primary" style={{ borderRadius: '12px', fontWeight: 700 }}>生成完整报告</Button>
                            </div>
                        </div>
                    )}
                </Drawer>

                <style>{`
                    .premium-table .ant-table {
                        background: transparent !important;
                        color: #1E293B !important;
                    }
                    .premium-table .ant-table-thead > tr > th {
                        background: #F8FAFC !important;
                        color: #64748B !important;
                        font-size: 11px !important;
                        text-transform: uppercase !important;
                        font-weight: 800 !important;
                        letter-spacing: 0.05em !important;
                        border-bottom: 2px solid #F1F5F9 !important;
                        padding: 16px !important;
                    }
                    .premium-table .ant-table-tbody > tr > td {
                        border-bottom: 1px solid #F1F5F9 !important;
                        padding: 12px 16px !important;
                        transition: all 0.2s !important;
                    }
                    .premium-table .ant-table-tbody > tr:hover > td {
                        background: rgba(99, 102, 241, 0.02) !important;
                        cursor: pointer;
                    }
                    .premium-table .ant-table-row-selected > td {
                        background: rgba(99, 102, 241, 0.05) !important;
                    }
                    
                    /* Custom Scrollbar */
                    .custom-scroll::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scroll::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                    }
                    .custom-scroll::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    /* Hide default antd table scrollbar */
                    .premium-table .ant-table-body::-webkit-scrollbar {
                        display: none;
                    }
                    
                    .action-btn:hover {
                        background: rgba(255, 255, 255, 0.1) !important;
                        transform: scale(1.1);
                    }
                    
                    @keyframes pulse-glow {
                        0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                    }
                `}</style>
            </div>
        </ConfigProvider>
    );
};

export default EtchingDatabase;
