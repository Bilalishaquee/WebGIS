import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';
import HeaderBar from './HeaderBar';

const DashboardLayout = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [scenario, setScenario] = useState(90);
  const [growthRate, setGrowthRate] = useState(2);
  const [projectionYears, setProjectionYears] = useState(5);
  
  const handleExport = () => {
    // Export functionality
    console.log('Exporting data...');
  };
  
  // Show full header controls on Dashboard and Analytics so growth/years can be changed from either page
  const showFullControls = location.pathname === '/' || location.pathname === '/analytics';
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      <SidebarNavigation 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-out ${isSidebarCollapsed ? 'ml-16' : 'lg:ml-64'} ml-0`}>
        <HeaderBar
          scenario={scenario}
          onScenarioChange={setScenario}
          growthRate={growthRate}
          onGrowthChange={setGrowthRate}
          projectionYears={projectionYears}
          onProjectionChange={setProjectionYears}
          onExport={handleExport}
          showFullControls={showFullControls}
        />
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <Outlet context={{ 
            scenario, 
            growthRate, 
            projectionYears,
            setScenario,
            setGrowthRate,
            setProjectionYears,
            handleExport
          }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
