import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import MapPanel from '../components/MapPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { generateParcels, calculateSummaryMetrics, calculateLandUseBreakdown } from '../utils/mockData';

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
  
  const parcels = useMemo(() => generateParcels(), []);
  const metrics = useMemo(() => calculateSummaryMetrics(parcels, scenario), [parcels, scenario]);
  const landUseBreakdown = useMemo(() => calculateLandUseBreakdown(parcels), [parcels]);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Main Map Section */}
      <div className={`flex-1 flex flex-col min-w-0 ${showAnalytics ? 'hidden lg:flex' : 'flex'} lg:w-3/5`}>
        {/* Filter Bar */}
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-4 sm:px-6 py-3 animate-fade-in">
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
            <select className="input-field text-xs sm:text-sm flex-1 lg:flex-initial">
              <option>Baseline Consumption</option>
            </select>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="lg:hidden btn-secondary text-xs flex items-center gap-2 flex-1 lg:flex-initial"
            >
              {showAnalytics ? 'Show Map' : 'Show Analytics'}
            </button>
          </div>
        </div>
        
        {/* Map Container */}
        <div className="flex-1 relative min-h-[280px] sm:min-h-[300px]">
          <MapPanel
            parcels={parcels}
            scenario={scenario}
            selectedLandUse={selectedLandUse}
            onParcelHover={setHoveredParcel}
            growthRate={growthRate}
            projectionYears={projectionYears}
          />
        </div>
      </div>
      
      {/* Analytics Panel */}
      <div className={`bg-transparent border-l border-gray-200/60 lg:w-2/5 min-w-0 overflow-hidden ${showAnalytics ? 'flex flex-col' : 'hidden lg:flex'}`}>
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
