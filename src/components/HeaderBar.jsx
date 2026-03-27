import { Droplet, Download, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/map': 'Map View',
  '/analytics': 'Analytics',
  '/chat': 'Chat',
  '/parcels': 'Parcels',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/data-sources': 'Data Sources',
};

const HeaderBar = ({ scenario, onScenarioChange, growthRate, onGrowthChange, projectionYears, onProjectionChange, onExport, exportLoading = false, showFullControls = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const handleExport = () => {
    onExport?.();
  };
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-sm sticky top-0 z-30 lg:pl-6 pl-16 animate-fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md shrink-0 transition-transform hover:scale-105">
          <Droplet className="text-white" size={20} />
        </div>
        <div className="min-w-0">
          {showFullControls ? (
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
              Demand Dashboard
            </h1>
          ) : (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-sm font-medium truncate">Demand Dashboard</span>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm font-semibold text-gray-900 truncate">{pageTitle}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
        {showFullControls && (
          <>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline px-2">Scenario:</span>
            <button
              onClick={() => onScenarioChange(90)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                scenario === 90
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
               0.09 m³/c
            </button>
            <button
              onClick={() => onScenarioChange(100)}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                scenario === 100
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
          0.1 m³/c
            </button>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Growth:</span>
            <input
              type="number"
              value={growthRate}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === '' ? 0 : Number(raw);
                if (!Number.isNaN(val)) {
                  const clamped = Math.min(20, Math.max(0, val));
                  onGrowthChange(clamped);
                }
              }}
              className="w-12 sm:w-16 px-2 py-1 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
              min="0"
              max="20"
              step="0.5"
            />
            <span className="text-xs sm:text-sm text-gray-600">%</span>
          </div>
          
          <select
            value={projectionYears}
            onChange={(e) => onProjectionChange(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white hover:bg-gray-50 transition-colors"
          >
            {[1, 2, 3, 4, 5, 7, 10].map(years => (
              <option key={years} value={years}>{years} Year{years > 1 ? 's' : ''}</option>
            ))}
          </select>
          
            <button
              type="button"
              onClick={handleExport}
              disabled={exportLoading}
              aria-busy={exportLoading}
              className="btn-primary flex items-center gap-2 text-xs sm:text-sm disabled:opacity-60 disabled:cursor-wait min-w-[7.5rem] justify-center"
            >
              {exportLoading ? (
                <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              ) : (
                <Download size={14} className="shrink-0" />
              )}
              <span>{exportLoading ? 'Generating…' : 'Export'}</span>
            </button>
          </>
        )}
        <button
          onClick={handleLogout}
          className="btn-secondary flex items-center gap-2 text-xs sm:text-sm ml-auto sm:ml-0"
          title="Logout"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;
