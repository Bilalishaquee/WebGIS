import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { generateParcels, formatNumber } from '../utils/mockData';

const Parcels = () => {
  const { scenario } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  const allParcels = useMemo(() => generateParcels(), []);
  
  const filteredParcels = useMemo(() => {
    return allParcels.filter(parcel => {
      const matchesSearch = parcel.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'All' || parcel.landUse === selectedType;
      return matchesSearch && matchesType;
    });
  }, [allParcels, searchTerm, selectedType]);
  
  const totalPages = Math.ceil(filteredParcels.length / itemsPerPage);
  const paginatedParcels = filteredParcels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const getLandUseColor = (landUse) => {
    switch (landUse) {
      case 'Residential':
        return 'bg-blue-100 text-blue-800';
      case 'Commercial':
        return 'bg-orange-100 text-orange-800';
      case 'Mixed-use':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
          Parcels
        </h2>
        
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
            onChange={(e) => setSelectedType(e.target.value)}
            className="input-field sm:w-auto"
          >
            <option value="All">All Types</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Mixed-use">Mixed-use</option>
          </select>
          <span className="text-sm text-gray-600">{filteredParcels.length} parcels</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200/60 overflow-hidden opacity-0 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
          <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Parcel ID
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Land Use
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  Population
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Daily (90L)
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Daily (100L)
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Yearly (90L)
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Yearly (100L)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedParcels.map((parcel) => (
                <tr key={parcel.id} className="hover:bg-gray-50/80 transition-colors duration-200">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                    {parcel.id}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLandUseColor(parcel.landUse)}`}>
                      {parcel.landUse}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden sm:table-cell">
                    {parcel.population}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                    {parcel.daily90.toLocaleString()} L
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                    {parcel.daily100.toLocaleString()} L
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 font-medium">
                    {parcel.yearly90.toLocaleString()} L
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden lg:table-cell">
                    {parcel.yearly100.toLocaleString()} L
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredParcels.length)}</span> of{' '}
              <span className="font-medium">{filteredParcels.length}</span> parcels
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-secondary text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs sm:text-sm text-gray-600 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Parcels;
