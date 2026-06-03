import { useState } from 'react';
import { parsePrice } from '../game/format';

interface GuessInputProps {
  onSubmit: (value: number) => void;
  disabled?: boolean;
}

export function GuessInput({ onSubmit, disabled }: GuessInputProps) {
  const [text, setText] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parsePrice(text);
    if (value === null) return;
    onSubmit(value);
    setText('');
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter Price"
        disabled={disabled}
        aria-label="Enter Price"
        className="w-full rounded-md border border-white/20 bg-white px-3 py-2.5 text-center text-lg text-black placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || parsePrice(text) === null}
        className="w-full rounded-md bg-accent py-2.5 font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit
      </button>
    </form>
  );
}
