import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PairingPage.css';

export default function PairingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (role === 'source') {
      const generated = String(Math.floor(100000 + Math.random() * 900000));
      setCode(generated);
      window.electronAPI?.invoke('pairing:generate', generated);
    }
  }, [role]);

  const handleInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...inputCode];
    next[index] = value;
    setInputCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) {
      window.electronAPI?.invoke('pairing:connect', next.join(''))
        .then((ok: unknown) => ok && navigate('/scan?role=target&method=lan'));
    }
  };

  if (role === 'source') {
    return (
      <div className="pairing-container">
        <h1>配对码</h1>
        <p className="pairing-hint">请在新电脑上输入此 6 位数字</p>
        <div className="pairing-code-display">{code}</div>
        <p className="pairing-waiting">等待新电脑连接...</p>
        <button className="pairing-back" onClick={() => navigate('/method?role=source')}>取消</button>
      </div>
    );
  }

  return (
    <div className="pairing-container">
      <h1>输入配对码</h1>
      <p className="pairing-hint">请输入旧电脑上显示的 6 位数字</p>
      <div className="pairing-input-row">
        {inputCode.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            className="pairing-digit"
            maxLength={1}
            value={d}
            onChange={e => handleInput(i, e.target.value)}
            autoFocus={i === 0}
          />
        ))}
      </div>
      <button className="pairing-back" onClick={() => navigate('/method?role=target')}>返回</button>
    </div>
  );
}
