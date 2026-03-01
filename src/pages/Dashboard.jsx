import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import MapPanel from '../components/MapPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { generateParcels, calculateSummaryMetrics, calculateLandUseBreakdown } from '../utils/mockData';

const Dashboard = () => {
  const { scenario, growthRate, projectionYears } = useOutletContext();
  const [selectedLandUse, setSelectedLandUse] = useState('All');
  const [hoveredParcel, setHoveredParcel] = useState(null);
  
  const parcels = useMemo(() => generateParcels(), []);
  const metrics = useMemo(() => calculateSummaryMetrics(parcels, scenario), [parcels, scenario]);
  const landUseBreakdown = useMemo(() => calculateLandUseBreakdown(parcels), [parcels]);
  
  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Main Map Section - 60% width */}
      <div className="flex-1 flex flex-col lg:w-3/5 min-w-0">
        {/* Filter Bar */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
          <select
            value={selectedLandUse}
            onChange={(e) => setSelectedLandUse(e.target.value)}
            className="input-field text-xs sm:text-sm"
          >
            <option value="All">All Types</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Mixed-use">Mixed-use</option>
          </select>
          <select className="input-field text-xs sm:text-sm">
            <option>Baseline Consumption</option>
          </select>
        </div>
        
        {/* Map Container */}
        <div className="flex-1 relative">
          <MapPanel
            parcels={parcels}
            scenario={scenario}
            selectedLandUse={selectedLandUse}
            onParcelHover={setHoveredParcel}
          />
        </div>
      </div>
      
      {/* Analytics Panel - 40% width */}
      <div className="bg-transparent border-l border-gray-200/60 lg:w-2/5 min-w-0 overflow-hidden">
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

export default Dashboard;
