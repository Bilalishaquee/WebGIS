import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { generateParcels, calculateSummaryMetrics, calculateLandUseBreakdown } from '../utils/mockData';

const Analytics = () => {
  const { scenario, growthRate, projectionYears } = useOutletContext();
  
  const parcels = useMemo(() => generateParcels(), []);
  const metrics = useMemo(() => calculateSummaryMetrics(parcels, scenario), [parcels, scenario]);
  const landUseBreakdown = useMemo(() => calculateLandUseBreakdown(parcels), [parcels]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Analytics Overview
        </h2>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <AnalyticsPanel
          metrics={metrics}
          landUseBreakdown={landUseBreakdown}
          scenario={scenario}
          growthRate={growthRate}
          projectionYears={projectionYears}
        />
      </div>
    </div>
  );
};

export default Analytics;
