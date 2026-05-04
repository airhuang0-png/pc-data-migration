import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import './ScanPreviewPage.css';

interface Section {
  id: string; label: string; size: number; selected: boolean; priority: number;
  children?: Section[];
}

export default function ScanPreviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';
  const method = params.get('method') || 'lan';

  const [scanning, setScanning] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [scanMsg, setScanMsg] = useState('正在扫描...');
  const [capacity] = useState({ available: 300 * 1024 * 1024 * 1024 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSections([
        { id: 'system_settings', label: '系统设置', size: 1.2 * 1024 * 1024, selected: true, priority: 0 },
        { id: 'browser', label: '浏览器数据', size: 86 * 1024 * 1024, selected: true, priority: 1,
          children: [
            { id: 'browser_chrome', label: 'Chrome', size: 45 * 1024 * 1024, selected: true, priority: 0 },
            { id: 'browser_edge', label: 'Edge', size: 41 * 1024 * 1024, selected: true, priority: 0 },
          ]
        },
        { id: 'app_configs', label: '应用配置', size: 2.1 * 1024 * 1024 * 1024, selected: true, priority: 2,
          children: [
            { id: 'app_wechat', label: '微信', size: 1.9 * 1024 * 1024 * 1024, selected: true, priority: 0 },
            { id: 'app_office', label: 'Office', size: 200 * 1024 * 1024, selected: true, priority: 0 },
          ]
        },
        { id: 'files', label: '用户文件', size: 120 * 1024 * 1024 * 1024, selected: true, priority: 3,
          children: [
            { id: 'files_desktop', label: '桌面', size: 12 * 1024 * 1024 * 1024, selected: true, priority: 0 },
            { id: 'files_docs', label: '文档', size: 35 * 1024 * 1024 * 1024, selected: true, priority: 1 },
            { id: 'files_pics', label: '图片', size: 45 * 1024 * 1024 * 1024, selected: false, priority: 2 },
            { id: 'files_videos', label: '视频', size: 25 * 1024 * 1024 * 1024, selected: false, priority: 3 },
            { id: 'files_downloads', label: '下载', size: 3 * 1024 * 1024 * 1024, selected: false, priority: 4 },
          ]
        },
      ]);
      setScanning(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const toggleSection = (id: string, parentId?: string) => {
    setSections(prev => prev.map(s => {
      if (parentId && s.id === parentId && s.children) {
        const updatedChildren = s.children.map(c => c.id === id ? { ...c, selected: !c.selected } : c);
        return { ...s, children: updatedChildren, selected: updatedChildren.some(c => c.selected) };
      }
      if (!parentId && s.id === id) {
        const newSel = !s.selected;
        return { ...s, selected: newSel, children: s.children?.map(c => ({ ...c, selected: newSel })) };
      }
      return s;
    }));
  };

  const totalSelected = sections.reduce((sum, s) =>
    sum + (s.children
      ? s.children.filter(c => c.selected).reduce((cs, c) => cs + c.size, 0)
      : s.selected ? s.size : 0), 0);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024**3)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024**2)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (scanning) {
    return (
      <div className="scan-container">
        <h1>{scanMsg}</h1>
        <ProgressBar percent={50} indeterminate />
      </div>
    );
  }

  const fits = totalSelected <= capacity.available;

  return (
    <div className="scan-container">
      <h1>选择要迁移的内容</h1>
      {!fits && (
        <div className="scan-warning">
          ⚠️ 已选数据超过目标容量 {formatSize(Math.max(0, totalSelected - capacity.available))}
        </div>
      )}
      <div className="scan-layout">
        <div className="scan-sections">
          {sections.map(s => (
            <div key={s.id} className="scan-section">
              <label className="scan-section-header">
                <input type="checkbox" checked={s.selected} onChange={() => toggleSection(s.id)} />
                <span>{s.label}</span>
                <span className="scan-section-size">{formatSize(s.size)}</span>
              </label>
              {s.children && (
                <div className="scan-children">
                  {s.children.map(c => (
                    <label key={c.id} className="scan-child">
                      <input type="checkbox" checked={c.selected} onChange={() => toggleSection(c.id, s.id)} />
                      <span>{c.label}</span>
                      <span className="scan-section-size">{formatSize(c.size)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="scan-summary">
          <div className="scan-capacity-bar">
            <ProgressBar percent={capacity.available > 0 ? Math.round((totalSelected / capacity.available) * 100) : 100} />
          </div>
          <p>已选: {formatSize(totalSelected)}</p>
          <p>目标可用: {formatSize(capacity.available)}</p>
          {!fits && <button className="scan-auto-btn">智能推荐选择</button>}
        </div>
      </div>
      <button className="scan-start-btn" disabled={totalSelected === 0} onClick={() => navigate(`/transfer?role=${role}&method=${method}`)}>
        开始迁移
      </button>
    </div>
  );
}
