import { useState, useRef, useCallback, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import MapPanel from '../components/MapPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { useParcels, useSummary, useLandUseBreakdown, useForecast } from '../hooks/useApi';
import { GripVertical } from 'lucide-react';

const MIN_MAP_PERCENT = 25;
const MAX_MAP_PERCENT = 85;
const DEFAULT_MAP_PERCENT = 60;
const RESIZE_HANDLE_WIDTH = 8;

const Dashboard = () => {
  const { 
    scenario, 
    growthRate, 
    projectionYears,
    setScenario,
    setGrowthRate,
    setProjectionYears,
    handleExport
  } = useOutletContext();
  const [selectedLandUse, setSelectedLandUse] = useState('All');
  const [hoveredParcel, setHoveredParcel] = useState(null);
  
  const { parcels, loading: parcelsLoading, error: parcelsError, refetch: refetchParcels } = useParcels(selectedLandUse, 0, 500);
  const { metrics: summaryMetrics, loading: summaryLoading, refetch: refetchSummary } = useSummary(scenario, selectedLandUse);
  const { landUseBreakdown, loading: breakdownLoading, refetch: refetchLandUse } = useLandUseBreakdown(selectedLandUse);
  const { forecastData, loading: forecastLoading, refetch: refetchForecast } = useForecast(growthRate ?? 2, projectionYears ?? 5, selectedLandUse);

  // Refetch forecast whenever growth rate or projection years change so the chart updates
  useEffect(() => {
    refetchForecast();
  }, [growthRate, projectionYears, refetchForecast]);

  const handleParcelUpdated = () => {
    refetchParcels();
    refetchSummary();
    refetchLandUse();
    refetchForecast();
  };

  const metrics = summaryMetrics ? {
    daily: summaryMetrics.daily,
    monthly: summaryMetrics.monthly,
    yearly: summaryMetrics.yearly,
    population: summaryMetrics.population,
  } : null;
  const landUseBreakdownList = landUseBreakdown?.breakdown ?? [];
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [mapWidthPercent, setMapWidthPercent] = useState(DEFAULT_MAP_PERCENT);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleResizeMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
    const clamped = Math.min(MAX_MAP_PERCENT, Math.max(MIN_MAP_PERCENT, pct));
    setMapWidthPercent(clamped);
  }, []);

  const handleResizeStart = useCallback(() => setIsDragging(true), []);

  useEffect(() => {
    if (!isDragging) return;
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', up);
    window.addEventListener('mouseleave', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mouseleave', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleResizeMove]);
  
  return (
    <div ref={containerRef} className="h-full flex flex-col lg:flex-row overflow-hidden">
      {parcelsError && (
        <div className="absolute top-14 left-0 right-0 z-50 bg-amber-100 text-amber-900 px-4 py-2 text-sm text-center">
          Could not load data. Is the backend running? (See README.)
        </div>
      )}
      {/* Main Map Section — resizable width on lg */}
      <div
        className={`flex flex-col min-w-0 ${showAnalytics ? 'hidden lg:flex' : 'flex'}`}
        style={{
          flex: `0 0 ${showAnalytics ? '100%' : `calc(${mapWidthPercent}% - ${RESIZE_HANDLE_WIDTH / 2}px)`}`,
          minWidth: showAnalytics ? undefined : 'min(100%, 320px)',
        }}
      >
        {/* Filter Bar */}
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-4 sm:px-6 py-3 animate-fade-in">
          <p className="text-xs text-gray-500 mb-2">Select a parcel on the map → Edit → Save. Map and analytics update automatically.</p>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap lg:flex-nowrap">
            <select
              value={selectedLandUse}
              onChange={(e) => setSelectedLandUse(e.target.value)}
              className="input-field text-xs sm:text-sm flex-1 lg:flex-initial"
            >
              <option value="All">All Types</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Mixed-use">Mixed-use</option>
            </select>
            <select
              value={scenario}
              onChange={(e) => setScenario(Number(e.target.value))}
              className="input-field text-xs sm:text-sm flex-1 lg:flex-initial"
            >
              <option value={90}>Baseline ( 0.09 m³/c)</option>
              <option value={100}>High estimate ( 0.1 m³/c)</option>
            </select>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="lg:hidden btn-secondary text-xs flex items-center gap-2 flex-1 lg:flex-initial"
            >
              {showAnalytics ? 'Show Map' : 'Show Analytics'}
            </button>
          </div>
        </div>
        
        {/* Map Container — only show loading when we have no parcels yet; never overlay grey on top of map */}
        <div className="flex-1 relative min-h-[280px] sm:min-h-[300px] min-w-0 overflow-hidden bg-transparent">
          {parcelsLoading && parcels.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80 rounded-xl">
              <span className="text-gray-600">Loading map…</span>
            </div>
          ) : null}
          {!(parcelsLoading && parcels.length === 0) ? (
            <MapPanel
              parcels={parcels}
              scenario={scenario}
              selectedLandUse={selectedLandUse}
              onParcelHover={setHoveredParcel}
              growthRate={growthRate}
              projectionYears={projectionYears}
              onParcelUpdated={handleParcelUpdated}
            />
          ) : null}
        </div>
      </div>

      {/* Resize handle — only on lg when both panels visible */}
      {!showAnalytics && (
        <div
          role="separator"
          aria-label="Resize map and analytics panels"
          onMouseDown={handleResizeStart}
          className="hidden lg:flex flex-shrink-0 w-2 cursor-col-resize bg-gray-200/80 hover:bg-blue-300/60 active:bg-blue-400/80 transition-colors items-center justify-center group"
          style={{ minWidth: RESIZE_HANDLE_WIDTH }}
        >
          <GripVertical size={14} className="text-gray-500 group-hover:text-blue-600 pointer-events-none" />
        </div>
      )}

      {/* Analytics Panel — resizable width on lg */}
      <div
        className={`bg-transparent border-l border-gray-200/60 min-w-0 overflow-auto ${showAnalytics ? 'flex flex-col' : 'hidden lg:flex'}`}
        style={{
          flex: showAnalytics ? '1 1 auto' : `0 0 calc(${100 - mapWidthPercent}% - ${RESIZE_HANDLE_WIDTH / 2}px)`,
          minWidth: showAnalytics ? undefined : 'min(100%, 280px)',
        }}
      >
        <AnalyticsPanel
          metrics={metrics}
          landUseBreakdown={landUseBreakdownList}
          scenario={scenario}
          growthRate={growthRate}
          projectionYears={projectionYears}
          forecastData={forecastData}
          loading={summaryLoading || breakdownLoading || forecastLoading}
          selectedLandUse={selectedLandUse}
        />
      </div>
    </div>
  );
};

export default Dashboard;
