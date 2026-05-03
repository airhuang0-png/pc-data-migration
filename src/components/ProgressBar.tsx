interface Props {
  percent: number;
  indeterminate?: boolean;
}

export function ProgressBar({ percent, indeterminate }: Props) {
  return (
    <div style={{ width: '100%', height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        width: indeterminate ? '50%' : `${Math.min(100, Math.max(0, percent))}%`,
        height: '100%', background: '#4a90d9', borderRadius: 4,
        transition: 'width 0.3s',
        ...(indeterminate ? { animation: 'progressIndeterminate 1.5s infinite' } : {})
      }} />
      <style>{`@keyframes progressIndeterminate { 0% { margin-left: -50%; } 100% { margin-left: 100%; } }`}</style>
    </div>
  );
}
