import { Droplet, Calendar, TrendingUp, Users } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber, generateForecastData } from '../utils/mockData';

const SummaryCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600',
  };
  
  return (
    <div className="card-gradient animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 sm:p-4 rounded-xl shadow-sm ${colorClasses[color]}`}>
          <Icon size={24} className="sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
};

const AnalyticsPanel = ({ metrics, landUseBreakdown, scenario, growthRate, projectionYears }) => {
  const COLORS = ['#3b82f6', '#14b8a6', '#f97316'];
  
  const pieData = landUseBreakdown.map(item => ({
    name: item.type,
    value: parseFloat(item.percentage),
    consumption: item.consumption,
  }));
  
  // Calculate base yearly values for both scenarios
  const baseYearly90 = metrics.yearly * 0.9;
  const baseYearly100 = metrics.yearly;
  
  const forecastData = generateForecastData(
    baseYearly90,
    baseYearly100,
    growthRate,
    projectionYears
  );
  
  const scenarioComparison = [
    {
      name: '90 L/c',
      value: baseYearly90,
    },
    {
      name: '100 L/c',
      value: baseYearly100,
    },
  ];
  
  const difference = baseYearly100 - baseYearly90;
  
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-transparent">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
        <SummaryCard
          icon={Droplet}
          label="DAILY DEMAND"
          value={`${formatNumber(metrics.daily)} L`}
          color="blue"
        />
        <SummaryCard
          icon={Calendar}
          label="MONTHLY DEMAND"
          value={`${formatNumber(metrics.monthly)} L`}
          color="green"
        />
        <SummaryCard
          icon={TrendingUp}
          label="YEARLY DEMAND"
          value={`${formatNumber(metrics.yearly)} L`}
          color="purple"
        />
        <SummaryCard
          icon={Users}
          label="EST. POPULATION"
          value={metrics.population.toLocaleString()}
          color="orange"
        />
      </div>
      
      {/* Land-Use Breakdown */}
      <div className="card-gradient animate-fade-in">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Land-Use Breakdown</h3>
        <div className="flex items-center gap-6">
          <div className="flex-1">
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
          <div className="space-y-3">
            {landUseBreakdown.map((item, index) => (
              <div key={item.type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
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
      <div className="card-gradient animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Demand Forecast</h3>
          <span className="text-xs sm:text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded-md">{growthRate}% growth</span>
        </div>
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          <LineChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => `${formatNumber(value)} L`}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="year90" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="90 L/c"
            />
            <Line 
              type="monotone" 
              dataKey="year100" 
              stroke="#14b8a6" 
              strokeWidth={2}
              name="100 L/c"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Scenario Comparison */}
      <div className="card-gradient animate-fade-in">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Scenario Comparison (Yearly)</h3>
        <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
          <BarChart data={scenarioComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value) => `${formatNumber(value)} L`}
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
          <span className="font-semibold text-gray-900">{formatNumber(difference)} L/year</span>
          <TrendingUp size={16} className="text-blue-600" />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
