import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from './api';

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    get<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Falha ao carregar os dados.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { data, loading, error, reload, setData };
}
