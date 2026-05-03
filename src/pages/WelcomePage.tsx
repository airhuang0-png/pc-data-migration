import { useNavigate } from 'react-router-dom';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <h1 className="welcome-title">PC 迁移助手</h1>
      <p className="welcome-subtitle">安全、快速地将数据从旧电脑迁移到新电脑</p>
      <div className="welcome-cards">
        <button className="welcome-card" onClick={() => navigate('/method?role=source')}>
          <div className="welcome-card-icon">📤</div>
          <h2>这是旧电脑</h2>
          <p>我要导出数据</p>
        </button>
        <button className="welcome-card" onClick={() => navigate('/method?role=target')}>
          <div className="welcome-card-icon">📥</div>
          <h2>这是新电脑</h2>
          <p>我要导入数据</p>
        </button>
      </div>
      <div className="welcome-footer">v1.0.0</div>
    </div>
  );
}
