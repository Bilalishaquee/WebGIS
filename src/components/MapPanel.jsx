import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { getConsumptionLevel } from '../utils/mockData';

const MapPanel = ({ parcels, scenario, selectedLandUse, onParcelHover }) => {
  const filteredParcels = selectedLandUse === 'All' 
    ? parcels 
    : parcels.filter(p => p.landUse === selectedLandUse);
  
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredParcels.map((parcel) => {
          const daily = scenario === 90 ? parcel.daily90 : parcel.daily100;
          const level = getConsumptionLevel(daily);
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
                mouseover: () => onParcelHover && onParcelHover(parcel),
                mouseout: () => onParcelHover && onParcelHover(null),
              }}
            >
              <Popup className="custom-popup">
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
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Consumption Level Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-4 border border-gray-200/60 z-10 animate-fade-in">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Consumption Level</h3>
        <div className="space-y-2">
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
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Leaflet | © OSM
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
