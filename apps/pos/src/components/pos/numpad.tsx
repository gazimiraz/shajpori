'use client';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  label?: string;
}

const KEYS = ['7','8','9','4','5','6','1','2','3','00','0','.'];

export function Numpad({ value, onChange, onEnter, label }: Props) {
  const press = (k: string) => {
    if (k === 'backspace') { onChange(value.slice(0, -1) || '0'); return; }
    if (k === 'clear') { onChange('0'); return; }
    if (value === '0' && k !== '.') { onChange(k); return; }
    if (k === '.' && value.includes('.')) return;
    onChange(value + k);
  };

  return (
    <div className="select-none">
      {label && <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">{label}</p>}
      <div className="text-right text-2xl font-bold px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg mb-2 font-mono">
        {value || '0'}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map(k => (
          <button
            key={k}
            onClick={() => press(k)}
            className="h-12 text-lg font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {k}
          </button>
        ))}
        <button onClick={() => press('backspace')} className="h-12 text-sm bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 text-amber-700 font-medium">⌫</button>
        <button onClick={() => press('clear')} className="h-12 text-sm bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-red-700 font-medium">CLR</button>
        {onEnter && (
          <button onClick={onEnter} className="h-12 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold">OK</button>
        )}
      </div>
    </div>
  );
}
