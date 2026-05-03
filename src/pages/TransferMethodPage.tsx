import { useNavigate, useSearchParams } from 'react-router-dom';
import './TransferMethodPage.css';

export default function TransferMethodPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';

  const select = (method: string) => {
    if (method === 'lan') {
      navigate(`/pairing?role=${role}`);
    } else {
      navigate(`/scan?role=${role}&method=storage`);
    }
  };

  return (
    <div className="method-container">
      <div className="method-back" onClick={() => navigate('/')}>← 返回</div>
      <h1>选择传输方式</h1>
      <div className="method-cards">
        <div className="method-card recommended" onClick={() => select('lan')}>
          <div className="method-badge">推荐</div>
          <h2>WiFi / 局域网</h2>
          <p>同一网络下直连传输，速度快</p>
        </div>
        <div className="method-card" onClick={() => select('storage')}>
          <h2>外接存储</h2>
          <p>U盘或移动硬盘中转，无需网络</p>
        </div>
      </div>
    </div>
  );
}
