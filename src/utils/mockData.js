// Generate mock parcel data
export const generateParcels = () => {
  const landUseTypes = ['Residential', 'Commercial', 'Mixed-use'];
  const parcels = [];
  
  for (let i = 1; i <= 380; i++) {
    const population = Math.floor(Math.random() * 13) + 2; // 2-15
    const landUse = landUseTypes[Math.floor(Math.random() * 3)];
    const daily90 = population * 90;
    const daily100 = population * 100;
    const yearly90 = daily90 * 365;
    const yearly100 = daily100 * 365;
    
    parcels.push({
      id: `P-${String(i).padStart(4, '0')}`,
      landUse,
      population,
      daily90,
      daily100,
      yearly90,
      yearly100,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1,
    });
  }
  
  return parcels;
};

export const calculateSummaryMetrics = (parcels, scenario = 90) => {
  const totalDaily = parcels.reduce((sum, p) => sum + (scenario === 90 ? p.daily90 : p.daily100), 0);
  const totalMonthly = totalDaily * 30;
  const totalYearly = totalDaily * 365;
  const totalPopulation = parcels.reduce((sum, p) => sum + p.population, 0);
  
  return {
    daily: totalDaily,
    monthly: totalMonthly,
    yearly: totalYearly,
    population: totalPopulation,
  };
};

export const calculateLandUseBreakdown = (parcels) => {
  const breakdown = {
    'Residential': { count: 0, consumption: 0 },
    'Commercial': { count: 0, consumption: 0 },
    'Mixed-use': { count: 0, consumption: 0 },
  };
  
  parcels.forEach(parcel => {
    breakdown[parcel.landUse].count++;
    breakdown[parcel.landUse].consumption += parcel.yearly90;
  });
  
  const total = Object.values(breakdown).reduce((sum, b) => sum + b.consumption, 0);
  
  return Object.entries(breakdown).map(([type, data]) => ({
    type,
    count: data.count,
    consumption: data.consumption,
    percentage: ((data.consumption / total) * 100).toFixed(1),
  }));
};

export const generateForecastData = (baseYearly90, baseYearly100, growthRate, years = 5) => {
  const data = [];
  for (let i = 0; i <= years; i++) {
    data.push({
      year: i === 0 ? 'Year 0' : `Year ${i}`,
      year90: baseYearly90 * Math.pow(1 + growthRate / 100, i),
      year100: baseYearly100 * Math.pow(1 + growthRate / 100, i),
    });
  }
  return data;
};

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
};

export const getConsumptionLevel = (daily) => {
  if (daily < 500) return { level: 'Low', color: '#93c5fd', threshold: '< 500 L' };
  if (daily < 800) return { level: 'Medium', color: '#60a5fa', threshold: '500-800' };
  if (daily < 1100) return { level: 'High', color: '#3b82f6', threshold: '800-1100' };
  return { level: 'Critical', color: '#1e40af', threshold: '> 1100' };
};
