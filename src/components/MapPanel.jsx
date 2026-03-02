import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import { getConsumptionLevel } from '../utils/mockData';
import { TrendingUp } from 'lucide-react';

// Component to detect mobile and prevent auto-popup
const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick && onMapClick(e);
    },
  });
  return null;
};

const MapPanel = ({ parcels, scenario, selectedLandUse, onParcelHover, growthRate, projectionYears }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const filteredParcels = selectedLandUse === 'All' 
    ? parcels 
    : parcels.filter(p => p.landUse === selectedLandUse);
  
  const handleMarkerClick = (parcel, e) => {
    if (isMobile) {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      setSelectedParcel(selectedParcel?.id === parcel.id ? null : parcel);
    }
  };
  
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        closePopupOnClick={!isMobile}
      >
        <MapEvents onMapClick={() => isMobile && setSelectedParcel(null)} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredParcels.map((parcel) => {
          const daily = scenario === 90 ? parcel.daily90 : parcel.daily100;
          const level = getConsumptionLevel(daily);
          const isSelected = selectedParcel?.id === parcel.id;
          
          return (
            <CircleMarker
              key={parcel.id}
              center={[parcel.lat, parcel.lng]}
              radius={6}
              fillColor={level.color}
              color={level.color}
              fillOpacity={0.7}
              weight={2}
              eventHandlers={{
                click: (e) => handleMarkerClick(parcel, e),
                mouseover: () => {
                  if (!isMobile) {
                    onParcelHover && onParcelHover(parcel);
                  }
                },
                mouseout: () => {
                  if (!isMobile) {
                    onParcelHover && onParcelHover(null);
                  }
                },
              }}
            >
              {!isMobile && (
                <Popup className="custom-popup" autoClose={true} closeOnClick={true}>
                  <div className="p-3">
                    <div className="font-bold text-sm text-gray-900 mb-2">{parcel.id}</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Land Use:</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {parcel.landUse}
                        </span>
                      </div>
                      <div><span className="font-medium">Population:</span> {parcel.population}</div>
                      <div><span className="font-medium">Daily:</span> {daily.toLocaleString()} L</div>
                      <div><span className="font-medium">Yearly:</span> {((scenario === 90 ? parcel.yearly90 : parcel.yearly100) / 1000).toFixed(1)}K L</div>
                    </div>
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Growth projection overlay — proposal: "Growth projection overlay" on map */}
      {(growthRate != null || projectionYears != null) && (
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-3 border border-gray-200/60 animate-fade-in-up max-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-900">Growth projection</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            {growthRate != null && <p><span className="font-medium">Growth:</span> {growthRate}%/year</p>}
            {projectionYears != null && <p><span className="font-medium">Horizon:</span> {projectionYears} year{projectionYears !== 1 ? 's' : ''}</p>}
          </div>
          <Link
            to="/analytics"
            className="mt-2 block text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            View 5-year forecast →
          </Link>
        </div>
      )}
      
      {/* Mobile Parcel Info Card */}
      {isMobile && selectedParcel && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-4 border border-gray-200/60 animate-fade-in-up">
          <div className="flex items-start justify-between mb-2">
            <div className="font-bold text-sm text-gray-900">{selectedParcel.id}</div>
            <button
              onClick={() => setSelectedParcel(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Land Use:</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                {selectedParcel.landUse}
              </span>
            </div>
            <div><span className="font-medium">Population:</span> {selectedParcel.population}</div>
            <div><span className="font-medium">Daily:</span> {(scenario === 90 ? selectedParcel.daily90 : selectedParcel.daily100).toLocaleString()} L</div>
            <div><span className="font-medium">Yearly:</span> {((scenario === 90 ? selectedParcel.yearly90 : selectedParcel.yearly100) / 1000).toFixed(1)}K L</div>
          </div>
        </div>
      )}
      
      {/* Consumption Level Legend */}
      <div className={`absolute bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-3 sm:p-4 border border-gray-200/60 z-10 animate-fade-in-up ${
        isMobile && selectedParcel 
          ? 'bottom-20 left-4 right-4' 
          : 'bottom-4 right-4'
      }`}>
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Consumption Level</h3>
        <div className="space-y-1.5 sm:space-y-2">
          {[
            { level: 'Low', threshold: '< 500 L', color: '#93c5fd' },
            { level: 'Medium', threshold: '500-800', color: '#60a5fa' },
            { level: 'High', threshold: '800-1100', color: '#3b82f6' },
            { level: 'Critical', threshold: '> 1100', color: '#1e40af' },
          ].map((item) => (
            <div key={item.level} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-700 font-medium">
                {item.level} ({item.threshold})
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200 text-xs text-gray-500">
          Leaflet | © OSM
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
