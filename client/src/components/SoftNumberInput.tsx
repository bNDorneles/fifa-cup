import { useEffect, useId, useState } from 'react';

interface Props {
  label?: string;
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  className?: string;
}

/** Number input that allows clearing while typing; clamps on blur. */
export default function SoftNumberInput({
  label,
  value,
  min,
  max,
  onCommit,
  className,
}: Props) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  function commit(raw: string) {
    if (raw.trim() === '') {
      onCommit(min);
      setText(String(min));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Math.round(n)));
    onCommit(clamped);
    setText(String(clamped));
  }

  const input = (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      value={text}
      onFocus={() => {
        setFocused(true);
        setText(String(value));
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || /^\d+$/.test(v)) setText(v);
      }}
      onBlur={() => {
        setFocused(false);
        commit(text);
      }}
    />
  );

  if (!label) return input;

  return (
    <label className="soft-number" htmlFor={id}>
      <span>{label}</span>
      {input}
    </label>
  );
}
