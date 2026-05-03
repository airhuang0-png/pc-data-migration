import { useNavigate } from 'react-router-dom';
import './CompletePage.css';

export default function CompletePage() {
  const navigate = useNavigate();

  return (
    <div className="complete-container">
      <div className="complete-icon">✓</div>
      <h1>迁移完成！</h1>
      <div className="complete-summary">
        <div className="complete-stat">
          <span className="complete-stat-num">12,483</span>
          <span className="complete-stat-label">文件已迁移</span>
        </div>
        <div className="complete-stat">
          <span className="complete-stat-num">156 GB</span>
          <span className="complete-stat-label">数据量</span>
        </div>
        <div className="complete-stat">
          <span className="complete-stat-num">8:32</span>
          <span className="complete-stat-label">耗时</span>
        </div>
      </div>
      <button className="complete-done-btn" onClick={() => navigate('/')}>完成</button>
    </div>
  );
}
