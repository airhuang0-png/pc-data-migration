import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import './TransferProgressPage.css';

export default function TransferProgressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'source';
  const sections = searchParams.get('sections') || '';

  const [percent, setPercent] = useState(0);
  const [currentFile, setCurrentFile] = useState('正在准备...');
  const [logExpanded, setLogExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{ fileCount?: number; totalSize?: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const addLog = (msg: string) => setLogs(prev => [...prev.slice(-50), msg]);

    if (role === 'source') {
      // Source: export and transfer
      window.electronAPI?.on('transfer:progress', (_data: unknown) => {
        const data = _data as any;
        if (data.percent !== undefined) setPercent(data.percent);
        if (data.file) setCurrentFile(data.file);
        addLog(data.file || `${data.percent}%`);
      });

      const selectedSections = sections ? sections.split(',') : [];
      window.electronAPI?.invoke('transfer:start', selectedSections).then((result: any) => {
        if (result?.success) {
          setPercent(100);
          setCurrentFile('传输完成');
          setStats(result.stats || {});
          setTimeout(() => navigate('/complete', { state: { ...result.stats, role: 'source' } }), 800);
        } else {
          setError(result?.error || '传输失败');
        }
      });
    } else {
      // Target: receive and import
      window.electronAPI?.on('import:progress', (_data: unknown) => {
        const data = _data as any;
        if (data.percent !== undefined) setPercent(data.percent);
        if (data.file) setCurrentFile(data.file);
        addLog(data.file || `${data.percent}%`);
      });

      window.electronAPI?.on('import:error', (_data: unknown) => {
        setError(_data as string);
        addLog('错误: ' + (_data as string));
      });

      window.electronAPI?.invoke('import:start').then((result: any) => {
        if (result?.success) {
          setPercent(100);
          setCurrentFile('导入完成');
          setStats(result.stats || {});
          setTimeout(() => navigate('/complete', { state: { ...result.stats, role: 'target' } }), 800);
        } else {
          setError(result?.error || '接收失败');
        }
      });
    }

    return () => {
      window.electronAPI?.removeAllListeners('transfer:progress');
      window.electronAPI?.removeAllListeners('import:progress');
      window.electronAPI?.removeAllListeners('import:error');
    };
  }, [role, sections]);

  const handleCancel = () => {
    window.electronAPI?.invoke('pairing:cancel');
    navigate('/');
  };

  return (
    <div className="transfer-container">
      <h1>{role === 'source' ? '正在迁移数据...' : '正在接收数据...'}</h1>
      <div className="transfer-progress">
        <ProgressBar percent={percent} />
        <span className="transfer-percent">{Math.round(percent)}%</span>
      </div>
      <div className="transfer-stats">
        <div className="transfer-stat">
          <span className="transfer-stat-label">当前</span>
          <span className="transfer-stat-value">{currentFile}</span>
        </div>
      </div>
      {error && <p className="transfer-error">{error}</p>}
      <div className="transfer-log-toggle" onClick={() => setLogExpanded(!logExpanded)}>
        {logExpanded ? '收起日志 ▴' : '展开日志 ▾'}
      </div>
      {logExpanded && (
        <div className="transfer-log">
          {logs.length === 0 ? <p className="transfer-log-empty">暂无日志</p> :
            logs.map((l, i) => <p key={i} className="transfer-log-line">{l}</p>)}
        </div>
      )}
      <button className="transfer-cancel" onClick={handleCancel}>取消</button>
    </div>
  );
}
