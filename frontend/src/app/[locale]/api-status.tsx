'use client';

import {useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

type Status = 'checking' | 'ok' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// Day-one connectivity proof: ping the FastAPI /health endpoint and show the result.
// A generous 60s timeout tolerates Render's free-tier cold start.
export function ApiStatus() {
  const t = useTranslations('Landing');
  const [status, setStatus] = useState<Status>('checking');
  const [asOf, setAsOf] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    fetch(`${API_BASE}/health`, {signal: controller.signal})
      .then((res) => res.json())
      .then((data: {as_of?: string}) => {
        setStatus('ok');
        setAsOf(data.as_of ?? '');
      })
      .catch(() => setStatus('error'))
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const text =
    status === 'checking'
      ? t('apiStatusChecking')
      : status === 'ok'
        ? t('apiStatusOk', {date: asOf})
        : t('apiStatusError');

  // AA token colours (not the raw brand hexes, which fail normal-text contrast).
  const color =
    status === 'ok' ? 'text-pos' : status === 'error' ? 'text-neg' : 'text-text-muted';

  return (
    <p
      className={`text-sm font-semibold ${color}`}
      data-status={status}
      role="status"
    >
      {text}
    </p>
  );
}
