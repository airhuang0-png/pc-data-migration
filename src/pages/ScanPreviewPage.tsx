import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import './ScanPreviewPage.css';

interface Section {
  id: string; label: string; size: number; selected: boolean; priority: number;
  children?: Section[];
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024**3)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024**2)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function ScanPreviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';
  const method = params.get('method') || 'lan';

  const [scanning, setScanning] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [scanMsg, setScanMsg] = useState('正在扫描...');

  useEffect(() => {
    if (role === 'source') {
      window.electronAPI?.on('scan:progress', (_data: unknown) => {
        const data = _data as { stage: string; message: string };
        setScanMsg(data.message);
      });

      window.electronAPI?.invoke('scan:start').then((result: any) => {
        if (result?.success) {
          const m = result.manifest;
          const sects: Section[] = [];
          if (m.sections.files) {
            sects.push({ id: 'files', label: '用户文件', size: m.sections.files.size, selected: true, priority: 3 });
          }
          if (m.sections.browser) {
            const browsers = m.sections.browser.browsers || [];
            sects.push({ id: 'browser', label: '浏览器数据', size: m.sections.browser.size, selected: true, priority: 1,
              children: browsers.map((b: string) => ({ id: `browser_${b}`, label: b, size: m.sections.browser!.size, selected: true, priority: 0 })) });
          }
          if (m.sections.app_configs) {
            const apps = m.sections.app_configs.apps || [];
            sects.push({ id: 'app_configs', label: '应用配置', size: m.sections.app_configs.size, selected: true, priority: 2,
              children: apps.map((a: string) => ({ id: `app_${a}`, label: a, size: m.sections.app_configs!.size, selected: true, priority: 0 })) });
          }
          if (m.sections.system_settings) {
            sects.push({ id: 'system_settings', label: '系统设置', size: m.sections.system_settings.size, selected: true, priority: 0 });
          }
          setSections(sects);
          setScanning(false);
        } else {
          setScanMsg('扫描失败: ' + (result?.error || '未知错误'));
        }
      });
    } else {
      // Target: listen for source starting transfer
      window.electronAPI?.on('import:detected', () => {
        navigate('/transfer?role=target&method=lan');
      });
      setScanning(false);
    }

    return () => {
      window.electronAPI?.removeAllListeners('scan:progress');
      window.electronAPI?.removeAllListeners('import:detected');
    };
  }, [role]);

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

  const totalSelected = sections
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.size, 0);

  const getSelectedIds = (): string[] => {
    return sections.filter(s => s.selected).map(s => s.id);
  };

  if (scanning) {
    return (
      <div className="scan-container">
        <h1>{scanMsg}</h1>
        <ProgressBar percent={50} indeterminate />
      </div>
    );
  }

  // Target side: just show waiting
  if (role === 'target') {
    return (
      <div className="scan-container">
        <h1>等待发送端传输...</h1>
        <p>源电脑将选择要迁移的数据并开始传输</p>
      </div>
    );
  }

  return (
    <div className="scan-container">
      <h1>选择要迁移的内容</h1>
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
          <p>已选: {formatSize(totalSelected)}</p>
        </div>
      </div>
      <button
        className="scan-start-btn"
        disabled={totalSelected === 0}
        onClick={() => navigate(`/transfer?role=${role}&method=${method}&sections=${getSelectedIds().join(',')}`)}
      >
        开始迁移
      </button>
    </div>
  );
}
