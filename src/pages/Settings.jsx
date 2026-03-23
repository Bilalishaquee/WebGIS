import { useState } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState({
    projectName: 'Neighborhood Water Demand',
    defaultScenario: 90,
    defaultGrowthRate: 2,
    showConsumptionLegend: true,
    enableParcelTooltips: true,
    clusterMarkersAtLowZoom: false,
    emailAlertsForHighConsumption: false,
    weeklySummaryReports: true,
  });
  
  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  
  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Settings
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {/* General Settings */}
        <div className="card-gradient opacity-0 animate-fade-in-up" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={settings.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Scenario (0.09 m³/c baseline vs 0.1 m³/c high estimate)
              </label>
              <input
                type="number"
                value={settings.defaultScenario}
                onChange={(e) => handleInputChange('defaultScenario', Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="50"
                max="150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Growth Rate (%)
              </label>
              <input
                type="number"
                value={settings.defaultGrowthRate}
                onChange={(e) => handleInputChange('defaultGrowthRate', Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="10"
                step="0.1"
              />
            </div>
          </div>
        </div>
        
        {/* Map Settings */}
        <div className="card-gradient opacity-0 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Map Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Show consumption legend</label>
                <p className="text-xs text-gray-500 mt-1">Display the consumption level legend on the map</p>
              </div>
              <button
                onClick={() => handleToggle('showConsumptionLegend')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  settings.showConsumptionLegend ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.showConsumptionLegend ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable parcel tooltips</label>
                <p className="text-xs text-gray-500 mt-1">Show detailed information on parcel hover</p>
              </div>
              <button
                onClick={() => handleToggle('enableParcelTooltips')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  settings.enableParcelTooltips ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.enableParcelTooltips ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Cluster markers at low zoom</label>
                <p className="text-xs text-gray-500 mt-1">Group nearby parcels when zoomed out</p>
              </div>
              <button
                onClick={() => handleToggle('clusterMarkersAtLowZoom')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  settings.clusterMarkersAtLowZoom ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.clusterMarkersAtLowZoom ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        
        {/* Notifications */}
        <div className="card-gradient opacity-0 animate-fade-in-up" style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email alerts for high consumption</label>
                <p className="text-xs text-gray-500 mt-1">Receive notifications when consumption exceeds thresholds</p>
              </div>
              <button
                onClick={() => handleToggle('emailAlertsForHighConsumption')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  settings.emailAlertsForHighConsumption ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.emailAlertsForHighConsumption ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Weekly summary reports</label>
                <p className="text-xs text-gray-500 mt-1">Get weekly email summaries of water demand trends</p>
              </div>
              <button
                onClick={() => handleToggle('weeklySummaryReports')}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  settings.weeklySummaryReports ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.weeklySummaryReports ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
