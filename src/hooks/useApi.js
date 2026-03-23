import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/client';

/**
 * Fetch parcels from API. Returns { parcels, total, loading, error, refetch }.
 * All consumption in parcels is in liters; convert to m³ for display with litersToM3().
 */
export function useParcels(landUse = 'All', skip = 0, limit = 500) {
  const [parcels, setParcels] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getParcels(landUse, skip, limit);
      setParcels(data.parcels || []);
      setTotal(data.total ?? data.parcels?.length ?? 0);
    } catch (e) {
      setError(e.message);
      setParcels([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [landUse, skip, limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { parcels, total, loading, error, refetch };
}

/**
 * Fetch summary metrics for a scenario. Values in liters; use litersToM3 for display.
 * landUse: optional filter (Residential, Commercial, Mixed-use, or 'All' for no filter).
 */
export function useSummary(scenario = 90, landUse = 'All') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSummary(scenario, landUse);
      setData(res);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scenario, landUse]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { metrics: data, loading, error, refetch };
}

/**
 * Land-use breakdown. Consumption values in liters.
 * landUse: optional filter (Residential, Commercial, Mixed-use, or 'All' for no filter).
 */
export function useLandUseBreakdown(landUse = 'All') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLandUseBreakdown(landUse);
      setData(res);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [landUse]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { landUseBreakdown: data, loading, error, refetch };
}

/**
 * Forecast (5-year). Values in liters.
 * landUse: optional filter (Residential, Commercial, Mixed-use, or 'All' for no filter).
 */
export function useForecast(growthRate = 2, years = 5, landUse = 'All') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    setLoading(true);
    return api.getForecast(growthRate, years, landUse)
      .then((res) => { setData(res); })
      .catch((e) => { setError(e.message); setData(null); })
      .finally(() => setLoading(false));
  }, [growthRate, years, landUse]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { forecastData: data?.data ?? [], loading, error, refetch };
}

/**
 * Scenario comparison (0.09 m³/c vs 0.1 m³/c). Values in liters from API.
 */
export function useScenarioComparison() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getScenarioComparison()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => { if (!cancelled) { setError(e.message); setData(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { scenarioComparison: data, loading, error };
}
