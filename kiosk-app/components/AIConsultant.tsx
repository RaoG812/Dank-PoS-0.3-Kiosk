'use client';
import { useState } from 'react';
import { generateConsultation } from '../lib/gemini';

interface Item { id: number; name: string; }

export default function AIConsultant({ items }: { items: Item[] }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    setLoading(true);
    const res = await generateConsultation(question, items.map(i => i.name));
    setAnswer(res);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        className="p-2 bg-[var(--color-bg-tertiary)] rounded"
        placeholder="Ask for product suggestions..."
        value={question}
        onChange={e => setQuestion(e.target.value)}
      />
      <button onClick={ask} className="bg-[var(--color-primary)] text-black py-1 rounded disabled:opacity-50" disabled={loading}>
        {loading ? 'Thinking...' : 'Ask AI'}
      </button>
      {answer && <p className="mt-2 text-sm">{answer}</p>}
    </div>
  );
}
