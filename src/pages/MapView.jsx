import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import MapPanel from '../components/MapPanel';
import { generateParcels } from '../utils/mockData';

const MapView = () => {
  const { scenario, growthRate, projectionYears } = useOutletContext();
  const [selectedLandUse, setSelectedLandUse] = useState('All');
  
  const parcels = useMemo(() => generateParcels(), []);
  
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
        <select className="input-field text-xs sm:text-sm">
          <option>Baseline Consumption</option>
        </select>
      </div>
      
      {/* Full Map */}
      <div className="flex-1 relative min-h-[300px]">
        <MapPanel
          parcels={parcels}
          scenario={scenario}
          selectedLandUse={selectedLandUse}
          growthRate={growthRate}
          projectionYears={projectionYears}
        />
      </div>
    </div>
  );
};

export default MapView;
