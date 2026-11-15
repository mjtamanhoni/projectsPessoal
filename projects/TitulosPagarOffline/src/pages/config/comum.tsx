import { useEffect, useState } from 'react';

export type FeedbackState = { tone: 'ok' | 'error'; msg: string } | null;

export function useFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  return { feedback, setFeedback };
}

export function FeedbackBar({ feedback }: { feedback: FeedbackState }) {
  if (!feedback) return null;
  return <div className={`feedback ${feedback.tone}`}>{feedback.msg}</div>;
}

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
