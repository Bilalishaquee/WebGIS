import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useParcels } from '../hooks/useApi';
import { formatM3 } from '../api/client';
import * as api from '../api/client';
import { Pencil } from 'lucide-react';

const pid = (p) => p.parcel_id ?? p.id;
const landUse = (p) => p.land_use ?? p.landUse;

const Parcels = () => {
  const { scenario } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingParcel, setEditingParcel] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const itemsPerPage = 25;
  const skip = (currentPage - 1) * itemsPerPage;

  const { parcels: apiParcels, total, loading, error, refetch } = useParcels(selectedType, skip, itemsPerPage);

  const filteredParcels = useMemo(() => {
    if (!searchTerm.trim()) return apiParcels;
    const term = searchTerm.toLowerCase();
    return apiParcels.filter((p) => String(pid(p)).toLowerCase().includes(term));
  }, [apiParcels, searchTerm]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const getLandUseColor = (lu) => {
    switch (lu) {
      case 'Residential': return 'bg-blue-100 text-blue-800';
      case 'Commercial': return 'bg-orange-100 text-orange-800';
      case 'Mixed-use': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSaveEdit = async (updates) => {
    if (!editingParcel) return;
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      await api.updateParcel(pid(editingParcel), updates);
      setEditingParcel(null);
      refetch();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
          Parcels
        </h2>
        {error && (
          <p className="text-sm text-amber-700 mb-2">Could not load parcels. Is the backend running?</p>
        )}
        {saveSuccess && (
          <p className="text-sm text-green-700 mb-2 font-medium">Parcel saved. Map and analytics will update when you open the Dashboard.</p>
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parcel ID..."
            className="flex-1 input-field"
          />
          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
            className="input-field sm:w-auto"
          >
            <option value="All">All Types</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Mixed-use">Mixed-use</option>
          </select>
          <span className="text-sm text-gray-600">{total} parcels</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading && filteredParcels.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Loading parcels…</div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200/60 overflow-hidden opacity-0 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Parcel ID</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Land Use</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Population</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Daily (90 L/c)</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">Daily (100 L/c)</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Yearly (90 L/c)</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">Yearly (100 L/c)</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">Edit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-gray-50/80 transition-colors duration-200">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{pid(parcel)}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLandUseColor(landUse(parcel))}`}>
                          {landUse(parcel)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden sm:table-cell">{parcel.population}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden md:table-cell">{formatM3(parcel.daily90)}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden md:table-cell">{formatM3(parcel.daily100)}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 font-medium">{formatM3(parcel.yearly90)}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden lg:table-cell">{formatM3(parcel.yearly100)}</td>
                      <td className="px-3 sm:px-6 py-4">
                        <button type="button" onClick={() => setEditingParcel(parcel)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Pencil size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600">
                  Showing <span className="font-medium">{skip + 1}</span> to <span className="font-medium">{Math.min(skip + itemsPerPage, total)}</span> of <span className="font-medium">{total}</span> parcels
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <span className="text-xs sm:text-sm text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
            <select value={land_use} onChange={(e) => setLandUse(e.target.value)} className="input-field w-full">
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Mixed-use">Mixed-use</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Population</label>
            <input type="number" min={0} max={1000} value={population} onChange={(e) => setPopulation(Number(e.target.value) || 0)} className="input-field w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="any" min={-90} max={90} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="4.59" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="any" min={-180} max={180} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-74.21" className="input-field w-full" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Parcels;
