import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Search, Filter, ChevronRight } from 'lucide-react';
import { Table, Image, Tag, Input, Space, Button, Typography, Progress, Badge, InputNumber } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import { API_BASE } from '../constants/config';
import { formatAngleDiff } from './EtchingDatabase.helpers';

const { Text } = Typography;

const EtchingDatabase = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState('id');
    const [order, setOrder] = useState('desc');
    const [jumpPage, setJumpPage] = useState(1);

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

    const API_HOST = API_BASE.replace('/api', '');

    const columns = [
        {
            title: 'UID', dataIndex: 'id', key: 'id', width: 55, fixed: 'left', align: 'center',
            render: id => <span style={{ fontFamily: 'monospace', color: '#94A3B8', fontSize: '10px' }}>#{id}</span>,
            sorter: true
        },
        {
            title: '实验标签', dataIndex: 'run_label', key: 'run_label', width: 130, fixed: 'left',
            render: text => <Text strong style={{ fontSize: '11px', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{text || 'UNNAMED'}</Text>,
            sorter: true
        },
        {
            title: 'V+ (V)', dataIndex: 'positive_voltage_v', key: 'positive_voltage_v', width: 70, align: 'right',
            render: v => <Text style={{ fontSize: '11px', fontWeight: 600 }}>{v?.toFixed(1)}</Text>,
            sorter: true
        },
        {
            title: 'Freq', dataIndex: 'frequency_hz', key: 'frequency_hz', width: 70, align: 'right',
            render: f => <Text style={{ fontSize: '11px', color: '#6366F1' }}>{f?.toFixed(0)}</Text>,
            sorter: true
        },
        {
            title: '深度', dataIndex: 'immersion_depth_um', key: 'immersion_depth_um', width: 70, align: 'right',
            render: d => <Text style={{ fontSize: '11px', color: '#F59E0B' }}>{d?.toFixed(0)}</Text>,
            sorter: true
        },
        {
            title: '目标', dataIndex: 'target_angle_deg', key: 'target_angle_deg', width: 65, align: 'center',
            render: a => <Text style={{ fontSize: '11px' }} type="secondary">{a || 0}°</Text>
        },
        {
            title: '实测', dataIndex: 'actual_angle_deg', key: 'actual_angle_deg', width: 65, align: 'center',
            render: a => <Text strong style={{ color: 'var(--primary)', fontSize: '11px' }}>{a || 0}°</Text>,
            sorter: true
        },
        {
            title: '误差', key: 'diff', width: 65, align: 'center',
            render: (_, item) => {
                const diff = item.angle_diff_deg ?? 0;
                return (
                    <Text style={{ fontSize: '10px', fontWeight: 800, color: Math.abs(diff) < 1.5 ? '#10B981' : '#F43F5E' }}>
                        {diff > 0 ? '+' : ''}{formatAngleDiff(diff)}
                    </Text>
                );
            }
        },
        {
            title: '对称性', dataIndex: 'symmetry_score', key: 'symmetry_score', width: 80, align: 'center',
            render: s => (
                <div style={{ padding: '0 2px' }}>
                    <Progress percent={(s || 0) * 10} showInfo={false} strokeColor={s > 8 ? '#10B981' : '#F59E0B'} size={[35, 2]} />
                    <div style={{ fontSize: '8px', color: '#94A3B8', marginTop: '-4px' }}>{s?.toFixed(1) || '--'}</div>
                </div>
            ),
            sorter: true
        },
        {
            title: '质量', dataIndex: 'quality_score', key: 'quality_score', width: 55, align: 'center',
            render: s => <Tag color={s > 8 ? 'green' : 'blue'} style={{ padding: '0 4px', margin: 0, fontSize: '9px', fontWeight: 900, height: '16px', lineHeight: '14px' }}>{s}</Tag>,
            sorter: true
        },
        {
            title: 'SEM', dataIndex: 'main_image_url', key: 'main_image_url', width: 60, align: 'center',
            render: url => url ? (
                <Image
                    src={API_HOST + url}
                    width={36}
                    height={20}
                    style={{ objectFit: 'cover', borderRadius: '2px', border: '1px solid #F1F5F9' }}
                    preview={{ mask: <FullscreenOutlined style={{ fontSize: 8 }} /> }}
                />
            ) : <span style={{ fontSize: '9px', color: '#CBD5E1' }}>MISS</span>
        },
        {
            title: '', key: 'action', width: 35, align: 'center', fixed: 'right',
            render: () => <ChevronRight size={12} color="#CBD5E1" style={{ cursor: 'pointer' }} />
        }
    ];

    return (
        <div style={{
            height: '100vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#F8FAFC',
            padding: '8px 12px'
        }}>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '32px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'var(--primary)', padding: '4px', borderRadius: '4px' }}>
                        <Layers size={14} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '14px', fontWeight: 900, color: '#1E293B', margin: 0 }}>实验数据库</h1>
                    <Badge count={total} overflowCount={999} style={{ backgroundColor: '#6366F1', scale: '0.7', marginLeft: '4px' }} />
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    <Input
                        size="small"
                        placeholder="快速搜索..."
                        prefix={<Search size={11} color="#94A3B8" />}
                        style={{ width: 120, height: '24px', borderRadius: '4px', fontSize: '11px' }}
                    />
                    <Button size="small" type="primary" ghost icon={<Filter size={11} />} style={{ height: '24px', padding: '0 8px', borderRadius: '4px', fontSize: '11px' }}>筛选</Button>
                </div>
            </header>

            <div style={{
                flex: 1,
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <Table
                    size="small"
                    dataSource={data}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 900, y: 'calc(100vh - 120px)' }}
                    style={{ flex: 1 }}
                    className="tight-table"
                    onChange={(p, f, s) => {
                        if (s.field) {
                            setSortBy(s.field);
                            setOrder(s.order === 'ascend' ? 'asc' : 'desc');
                        }
                    }}
                />

                <footer style={{
                    height: '32px',
                    padding: '0 12px',
                    borderTop: '1px solid #F1F5F9',
                    background: '#FAFBFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Text style={{ fontSize: '10px', color: '#94A3B8' }}>{total} Records</Text>
                        <Space size={4}>
                            <Text style={{ fontSize: '10px' }}>Jump to:</Text>
                            <InputNumber
                                size="small"
                                min={1}
                                max={Math.ceil(total / pageSize)}
                                value={jumpPage}
                                onChange={v => setJumpPage(v)}
                                onPressEnter={handleJump}
                                style={{ width: 40, height: '20px', fontSize: '10px' }}
                            />
                            <Button size="small" onClick={handleJump} style={{ height: '20px', fontSize: '10px', padding: '0 4px', borderRadius: '3px' }}>GO</Button>
                        </Space>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Button size="small" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ fontSize: '10px', height: '20px', padding: '0 8px' }}>Prev</Button>
                        <Text style={{ fontSize: '10px', fontWeight: 800 }}>{page} / {Math.ceil(total / pageSize)}</Text>
                        <Button size="small" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)} style={{ fontSize: '10px', height: '20px', padding: '0 8px' }}>Next</Button>
                    </div>
                </footer>
            </div>

            <style jsx="true">{`
                .tight-table { overflow: hidden !important; }
                .tight-table .ant-table-body { overflow: hidden !important; }
                .tight-table .ant-table-thead > tr > th {
                    background: #F8FAFC !important;
                    font-size: 10px !important;
                    font-weight: 800 !important;
                    color: #64748B !important;
                    padding: 4px 10px !important;
                    height: 30px !important;
                    border-bottom: 2px solid #F1F5F9 !important;
                }
                .tight-table .ant-table-tbody > tr > td {
                    padding: 0 10px !important;
                    height: 36px !important;
                    border-bottom: 1px solid #F8FAFC !important;
                    font-size: 11px !important;
                }
                .tight-table .ant-table-tbody > tr:hover > td {
                    background: #F1F5F9 !important;
                }
                
                /* 彻底隐藏所有滚动条 */
                *::-webkit-scrollbar { display: none !important; }
                * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
            `}</style>
        </div>
    );
};

export default EtchingDatabase;
