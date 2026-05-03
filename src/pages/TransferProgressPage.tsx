import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProgressBar } from '../components/ProgressBar';
import './TransferProgressPage.css';

export default function TransferProgressPage() {
  const navigate = useNavigate();
  const [percent, setPercent] = useState(0);
  const [currentFile, setCurrentFile] = useState('正在准备...');
  const [speed, setSpeed] = useState('0 MB/s');
  const [remaining, setRemaining] = useState('计算中...');
  const [logExpanded, setLogExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return Math.min(100, p + Math.random() * 3);
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (percent >= 100) {
      setTimeout(() => navigate('/complete'), 800);
    }
  }, [percent, navigate]);

  return (
    <div className="transfer-container">
      <h1>正在迁移数据...</h1>
      <div className="transfer-progress">
        <ProgressBar percent={percent} />
        <span className="transfer-percent">{Math.round(percent)}%</span>
      </div>
      <div className="transfer-stats">
        <div className="transfer-stat">
          <span className="transfer-stat-label">当前文件</span>
          <span className="transfer-stat-value">{currentFile}</span>
        </div>
        <div className="transfer-stat">
          <span className="transfer-stat-label">速度</span>
          <span className="transfer-stat-value">{speed}</span>
        </div>
        <div className="transfer-stat">
          <span className="transfer-stat-label">剩余时间</span>
          <span className="transfer-stat-value">{remaining}</span>
        </div>
      </div>
      <div className="transfer-log-toggle" onClick={() => setLogExpanded(!logExpanded)}>
        {logExpanded ? '收起日志 ▴' : '展开日志 ▾'}
      </div>
      {logExpanded && (
        <div className="transfer-log">
          {logs.length === 0 ? <p className="transfer-log-empty">暂无日志</p> :
            logs.map((l, i) => <p key={i} className="transfer-log-line">{l}</p>)}
        </div>
      )}
      <button className="transfer-cancel" onClick={() => navigate('/')}>取消迁移</button>
    </div>
  );
}
