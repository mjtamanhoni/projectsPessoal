import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface UseApiState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useApi<T>(endpoint: string) {
  const [state, setState] = useState<UseApiState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  const extractError = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      return axiosErr.response?.data?.error ?? axiosErr.message ?? 'Erro desconhecido';
    }
    return err instanceof Error ? err.message : 'Erro desconhecido';
  };

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.get(endpoint);
      const result = response.data as T[];
      setState({ data: Array.isArray(result) ? result : [], loading: false, error: null });
    } catch (err: unknown) {
      setState({ data: [], loading: false, error: extractError(err) });
    }
  }, [endpoint]);

  const fetchOne = useCallback(async (id: number): Promise<T | null> => {
    try {
      const response = await api.get(endpoint, { params: { id } });
      const result = response.data as T[];
      return result && result.length > 0 ? result[0] : null;
    } catch {
      return null;
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = async (body: Partial<T>): Promise<unknown> => {
    try {
      const response = await api.post(endpoint, body);
      await fetchData();
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractError(err));
    }
  };

  const update = async (body: Partial<T>): Promise<unknown> => {
    try {
      const response = await api.post(endpoint, body);
      await fetchData();
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractError(err));
    }
  };

  const remove = async (id: number): Promise<void> => {
    try {
      await api.delete(endpoint, { params: { id } });
      await fetchData();
    } catch (err: unknown) {
      throw new Error(extractError(err));
    }
  };

  return { ...state, refetch: fetchData, create, update, remove, fetchOne };
}
