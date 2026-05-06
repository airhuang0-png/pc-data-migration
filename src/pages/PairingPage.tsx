import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PairingPage.css';

export default function PairingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'source';
  const [code, setCode] = useState('');
  const [inputCode, setInputCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const paired = useRef(false);

  useEffect(() => {
    if (role === 'source') {
      window.electronAPI?.invoke('pairing:generate').then((result: any) => {
        if (result?.code) {
          setCode(result.code);
        } else if (result?.error) {
          setError(result.error);
        }
      });

      window.electronAPI?.on('pairing:ready', () => {
        paired.current = true;
        navigate('/scan?role=source&method=lan');
      });
    }
    return () => {
      window.electronAPI?.removeAllListeners('pairing:ready');
      if (!paired.current) {
        window.electronAPI?.invoke('pairing:cancel');
      }
    };
  }, [role]);

  const handleConnect = async (codeStr: string) => {
    setConnecting(true);
    setError('');
    const result: any = await window.electronAPI?.invoke('pairing:connect', codeStr);
    setConnecting(false);
    if (result?.success) {
      paired.current = true;
      navigate('/scan?role=target&method=lan');
    } else {
      setError(result?.error || '连接失败');
      setInputCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleInput = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...inputCode];
    next[index] = value;
    setInputCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every(d => d !== '')) {
      handleConnect(next.join(''));
    }
  };

  const handleCancel = () => {
    window.electronAPI?.invoke('pairing:cancel');
    navigate('/method?role=' + role);
  };

  if (role === 'source') {
    return (
      <div className="pairing-container">
        <h1>配对码</h1>
        <p className="pairing-hint">请在新电脑上输入此 6 位数字</p>
        <div className="pairing-code-display">{code || '...'}</div>
        {error && <p className="pairing-error">{error}</p>}
        <p className="pairing-waiting">等待新电脑连接...</p>
        <button className="pairing-back" onClick={handleCancel}>取消</button>
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
            disabled={connecting}
            autoFocus={i === 0}
          />
        ))}
      </div>
      {connecting && <p className="pairing-status">正在连接...</p>}
      {error && <p className="pairing-error">{error}</p>}
      <button className="pairing-back" onClick={handleCancel} disabled={connecting}>返回</button>
    </div>
  );
}
