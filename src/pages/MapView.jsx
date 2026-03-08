import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import MapPanel from '../components/MapPanel';
import { useParcels } from '../hooks/useApi';

const MapView = () => {
  const { scenario, setScenario, growthRate, projectionYears } = useOutletContext();
  const [selectedLandUse, setSelectedLandUse] = useState('All');
  
  const { parcels, loading, error, refetch } = useParcels(selectedLandUse, 0, 500);
  
  return (
    <div className="h-full flex flex-col">
      {/* Filter Bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 flex-wrap lg:pl-6 pl-16 animate-fade-in">
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
        <select
          value={scenario}
          onChange={(e) => setScenario(Number(e.target.value))}
          className="input-field text-xs sm:text-sm"
        >
          <option value={90}>Baseline (90 L/c)</option>
          <option value={100}>High estimate (100 L/c)</option>
        </select>
      </div>
      
      {/* Full Map */}
      <div className="flex-1 relative min-h-[300px]">
        {loading && parcels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 rounded-xl"><span className="text-gray-600">Loading map…</span></div>
        ) : (
          <MapPanel
            parcels={parcels}
            scenario={scenario}
            selectedLandUse={selectedLandUse}
            growthRate={growthRate}
            projectionYears={projectionYears}
            onParcelUpdated={refetch}
          />
        )}
      </div>
    </div>
  );
};

export default MapView;
