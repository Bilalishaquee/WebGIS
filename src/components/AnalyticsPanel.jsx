import { Droplet, Calendar, TrendingUp, Users } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatM3 } from '../api/client';

const SummaryCard = ({ icon: Icon, label, value, color = 'blue', delay = 0 }) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600',
  };
  
  return (
    <div
      className="card-gradient opacity-0 animate-fade-in-up min-w-0 p-2.5 sm:p-3"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-600 font-medium truncate">{label}</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 truncate" title={value}>{value}</p>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${colorClasses[color]}`}>
          <Icon size={16} className="sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  );
};

const AnalyticsPanel = ({ metrics, landUseBreakdown, scenario, growthRate, projectionYears, forecastData: apiForecast, loading, selectedLandUse }) => {
  const COLORS = ['#3b82f6', '#14b8a6', '#f97316'];
  const forecastKey = `forecast-${growthRate ?? 2}-${projectionYears ?? 5}`;

  if (loading || !metrics) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <span className="text-gray-500">Loading analytics…</span>
      </div>
    );
  }

  const landUseList = Array.isArray(landUseBreakdown) ? landUseBreakdown : [];
  const pieData = landUseList.map(item => ({
    name: item.type,
    value: parseFloat(item.percentage),
    consumption: item.consumption,
  }));

  const baseYearly90 = metrics.yearly * 0.9;
  const baseYearly100 = metrics.yearly;

  const forecastData = Array.isArray(apiForecast) && apiForecast.length > 0 ? apiForecast : [];
  
  const scenarioComparison = [
    { name: '0.09 m³/c', value: baseYearly90 },
    { name: '0.1 m³/c', value: baseYearly100 },
  ];
  
  const difference = baseYearly100 - baseYearly90;
  
  return (
    <div className="h-full overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-transparent min-w-0">
      {selectedLandUse && selectedLandUse !== 'All' && (
        <p className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit">
          Filter: {selectedLandUse}
        </p>
      )}
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <SummaryCard
          icon={Droplet}
          label="Daily"
          value={formatM3(metrics.daily)}
          color="blue"
          delay={0}
        />
        <SummaryCard
          icon={Calendar}
          label="Monthly"
          value={formatM3(metrics.monthly)}
          color="green"
          delay={50}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Yearly"
          value={formatM3(metrics.yearly)}
          color="purple"
          delay={100}
        />
        <SummaryCard
          icon={Users}
          label="Population"
          value={metrics.population.toLocaleString()}
          color="orange"
          delay={150}
        />
      </div>
      
      {/* Land-Use Breakdown */}
      <div
        className="card-gradient opacity-0 animate-fade-in-up min-w-0 overflow-visible"
        style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Land-Use Breakdown</h3>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="w-full sm:flex-1 min-w-[160px]" style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 shrink-0">
            {landUseList.map((item, index) => (
              <div key={item.type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-700">{item.type}</span>
                <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Demand Forecast */}
      <div
        className="card-gradient opacity-0 animate-fade-in-up"
        style={{ animationDelay: '280ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Demand Forecast</h3>
          <span className="text-xs sm:text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded-md">{growthRate}% growth · {projectionYears} year{projectionYears !== 1 ? 's' : ''}</span>
        </div>
        {forecastData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          <LineChart key={forecastKey} data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => formatM3(value)}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="year90" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="0.09 m³/c"
            />
            <Line 
              type="monotone" 
              dataKey="year100" 
              stroke="#14b8a6" 
              strokeWidth={2}
              name="0.1 m³/c"
            />
          </LineChart>
        </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Forecast from API (Analytics page loads it)</div>
        )}
      </div>
      
      {/* Scenario Comparison */}
      <div
        className="card-gradient opacity-0 animate-fade-in-up"
        style={{ animationDelay: '360ms', animationFillMode: 'forwards' }}
      >
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Scenario Comparison (Yearly)</h3>
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          <BarChart data={scenarioComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => formatM3(value)}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
              {scenarioComparison.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#14b8a6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-gray-600">Difference:</span>
          <span className="font-semibold text-gray-900">{formatM3(difference)}/year</span>
          <TrendingUp size={16} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
