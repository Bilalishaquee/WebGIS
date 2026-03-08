import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { getConsumptionLevel } from '../utils/consumption';
import { TrendingUp, Pencil, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatM3 } from '../api/client';
import * as api from '../api/client';

const pid = (p) => p.parcel_id ?? p.id;
const landUse = (p) => p.land_use ?? p.landUse;

function getMapView(parcels) {
  if (!parcels?.length) return { center: [4.5868, -74.2117], zoom: 15 };
  const lats = parcels.map((p) => p.lat).filter((x) => typeof x === 'number');
  const lngs = parcels.map((p) => p.lng).filter((x) => typeof x === 'number');
  if (!lats.length || !lngs.length) return { center: [4.5868, -74.2117], zoom: 15 };
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const center = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
  const span = Math.max(maxLat - minLat, maxLng - minLng) || 0.02;
  const zoom = span > 0.2 ? 11 : span > 0.05 ? 13 : 15;
  return { center, zoom };
}

// Component to detect mobile and prevent auto-popup
const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick && onMapClick(e);
    },
  });
  return null;
};

// When the panel or window resizes, tell Leaflet to recalculate the map size so it fills the container (no gray gap).
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

const MapPanel = ({ parcels, scenario, selectedLandUse, onParcelHover, growthRate, projectionYears, onParcelUpdated }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [editingParcel, setEditingParcel] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [growthPanelCollapsed, setGrowthPanelCollapsed] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!saveSuccess) return;
    const t = setTimeout(() => setSaveSuccess(false), 2500);
    return () => clearTimeout(t);
  }, [saveSuccess]);
  
  const filteredParcels = selectedLandUse === 'All' 
    ? parcels 
    : parcels.filter(p => landUse(p) === selectedLandUse);
  const { center, zoom } = getMapView(parcels?.length ? parcels : []);

  const handleMarkerClick = (parcel, e) => {
    if (isMobile) {
      e.originalEvent.preventDefault();
      e.originalEvent.stopPropagation();
      setSelectedParcel(selectedParcel?.id === parcel.id ? null : parcel);
    }
  };

  const handleSaveEdit = async (updates) => {
    if (!editingParcel) return;
    setSaveLoading(true);
    try {
      await api.updateParcel(pid(editingParcel), updates);
      setEditingParcel(null);
      setSelectedParcel(null);
      onParcelUpdated && onParcelUpdated();
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save');
    } finally {
      setSaveLoading(false);
    }
  };
  
  return (
    <div className="relative h-full w-full min-w-0 min-h-0">
      {/* Success toast after parcel save */}
      {saveSuccess && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in-up">
          <CheckCircle size={18} />
          Parcel updated. Map and analytics refreshed.
        </div>
      )}
      <MapContainer
        key={`map-${center[0].toFixed(4)}-${center[1].toFixed(4)}-${zoom}`}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', minHeight: 0 }}
        scrollWheelZoom={true}
        closePopupOnClick={!isMobile}
      >
        <MapResizeHandler />
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
              key={`${parcel.id}-${scenario}`}
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
                  <div className="p-3 min-w-[180px]">
                    <div className="font-bold text-sm text-gray-900 mb-2">{pid(parcel)}</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Land Use:</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {landUse(parcel)}
                        </span>
                      </div>
                      <div><span className="font-medium">Population:</span> {parcel.population}</div>
                      <div><span className="font-medium">Daily:</span> {formatM3(daily)}</div>
                      <div><span className="font-medium">Yearly:</span> {formatM3(scenario === 90 ? parcel.yearly90 : parcel.yearly100)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingParcel(parcel)}
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Growth projection overlay — affects forecast chart only, not map colors */}
      {(growthRate != null || projectionYears != null) && (
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/60 animate-fade-in-up max-w-[180px]">
          <button
            type="button"
            onClick={() => setGrowthPanelCollapsed((c) => !c)}
            className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-gray-50/80 rounded-xl transition-colors"
            aria-expanded={!growthPanelCollapsed}
            aria-label={growthPanelCollapsed ? 'Show growth projection' : 'Hide growth projection'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <TrendingUp size={16} className="text-blue-600 shrink-0" />
              <span className="text-xs font-semibold text-gray-900 truncate">Growth projection</span>
            </div>
            <span className="shrink-0 p-1 rounded text-gray-500 hover:bg-gray-200/60">
              {growthPanelCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </span>
          </button>
          {!growthPanelCollapsed && (
            <div className="px-3 pb-3">
              <div className="text-xs text-gray-600 space-y-1">
                {growthRate != null && <p><span className="font-medium">Growth:</span> {growthRate}%/year</p>}
                {projectionYears != null && <p><span className="font-medium">Horizon:</span> {projectionYears} year{projectionYears !== 1 ? 's' : ''}</p>}
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for forecast chart (Analytics), not map colors.</p>
              <Link
                to="/analytics"
                className="mt-2 block text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                View forecast chart →
              </Link>
            </div>
          )}
        </div>
      )}
      
      {/* Mobile Parcel Info Card */}
      {isMobile && selectedParcel && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-4 border border-gray-200/60 animate-fade-in-up">
          <div className="flex items-start justify-between mb-2">
            <div className="font-bold text-sm text-gray-900">{pid(selectedParcel)}</div>
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
                {landUse(selectedParcel)}
              </span>
            </div>
            <div><span className="font-medium">Population:</span> {selectedParcel.population}</div>
            <div><span className="font-medium">Daily:</span> {formatM3(scenario === 90 ? selectedParcel.daily90 : selectedParcel.daily100)}</div>
            <div><span className="font-medium">Yearly:</span> {formatM3(scenario === 90 ? selectedParcel.yearly90 : selectedParcel.yearly100)}</div>
          </div>
          <button
            type="button"
            onClick={() => setEditingParcel(selectedParcel)}
            className="mt-2 w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
          >
            <Pencil size={12} /> Edit parcel
          </button>
        </div>
      )}
      
      {/* Consumption Level Legend — daily consumption per parcel (colors respond to scenario 90 vs 100 L/c) */}
      <div className={`absolute bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/60 z-10 animate-fade-in-up ${
        isMobile && selectedParcel 
          ? 'bottom-20 left-4 right-4' 
          : 'bottom-4 right-4'
      }`}>
        <button
          type="button"
          onClick={() => setLegendCollapsed((c) => !c)}
          className="w-full flex items-center justify-between gap-2 p-3 sm:p-4 text-left hover:bg-gray-50/80 rounded-xl transition-colors"
          aria-expanded={!legendCollapsed}
          aria-label={legendCollapsed ? 'Show consumption legend' : 'Hide consumption legend'}
        >
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Consumption Level</h3>
            {legendCollapsed && (
              <p className="text-xs text-gray-500 mt-0.5">Daily per parcel ({scenario} L/c)</p>
            )}
          </div>
          <span className="shrink-0 p-1 rounded text-gray-500 hover:bg-gray-200/60">
            {legendCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </span>
        </button>
        {!legendCollapsed && (
          <>
            <div className="px-3 sm:px-4 pb-2">
              <p className="text-xs text-gray-500 mb-2">Daily consumption per parcel (current scenario: {scenario} L/c)</p>
              <div className="space-y-1.5 sm:space-y-2">
                {[
                  { level: 'Low', threshold: '< 0.5 m³', color: '#93c5fd' },
                  { level: 'Medium', threshold: '0.5–0.8 m³', color: '#60a5fa' },
                  { level: 'High', threshold: '0.8–1.1 m³', color: '#3b82f6' },
                  { level: 'Critical', threshold: '> 1.1 m³', color: '#1e40af' },
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
            </div>
            <div className="px-3 sm:px-4 py-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
              Leaflet | © OSM
            </div>
          </>
        )}
      </div>

      {/* Edit Parcel Modal */}
      {editingParcel && (
        <EditParcelModal
          parcel={editingParcel}
          onClose={() => setEditingParcel(null)}
          onSave={handleSaveEdit}
          loading={saveLoading}
        />
      )}
    </div>
  );
};

function EditParcelModal({ parcel, onClose, onSave, loading }) {
  const [land_use, setLandUse] = useState(parcel.land_use ?? parcel.landUse);
  const [population, setPopulation] = useState(parcel.population);
  const [lat, setLat] = useState(parcel.lat != null ? String(parcel.lat) : '');
  const [lng, setLng] = useState(parcel.lng != null ? String(parcel.lng) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = { land_use, population };
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isNaN(latNum)) updates.lat = latNum;
    if (!Number.isNaN(lngNum)) updates.lng = lngNum;
    onSave(updates);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit parcel {pid(parcel)}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Land use</label>
            <select
              value={land_use}
              onChange={(e) => setLandUse(e.target.value)}
              className="input-field w-full"
            >
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Mixed-use">Mixed-use</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Population</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={population}
              onChange={(e) => setPopulation(Number(e.target.value) || 0)}
              className="input-field w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="any" min={-90} max={90} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 4.59" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="any" min={-180} max={180} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. -74.21" className="input-field w-full" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MapPanel;
