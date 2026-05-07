import { useNavigate, useLocation } from 'react-router-dom';
import './CompletePage.css';

function formatSize(bytes: number) {
  if (!bytes || bytes === 0) return '—';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024**3)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024**2)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function CompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as { fileCount?: number; totalSize?: number; role?: string };

  return (
    <div className="complete-container">
      <div className="complete-icon">✓</div>
      <h1>{state.role === 'target' ? '接收完成！' : '迁移完成！'}</h1>
      <div className="complete-summary">
        <div className="complete-stat">
          <span className="complete-stat-num">{state.fileCount || '—'}</span>
          <span className="complete-stat-label">文件已迁移</span>
        </div>
        <div className="complete-stat">
          <span className="complete-stat-num">{formatSize(state.totalSize || 0)}</span>
          <span className="complete-stat-label">数据量</span>
        </div>
      </div>
      <button className="complete-done-btn" onClick={() => {
        window.electronAPI?.invoke('cleanup');
        navigate('/');
      }}>完成</button>
    </div>
  );
}
