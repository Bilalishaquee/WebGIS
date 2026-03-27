import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';
import HeaderBar from './HeaderBar';
import { downloadPdfReport } from '../api/client';

const DashboardLayout = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [scenario, setScenario] = useState(90);
  const [growthRate, setGrowthRate] = useState(2);
  const [projectionYears, setProjectionYears] = useState(5);
  /** Land-use filter last seen on Dashboard (export uses this when generating PDF). */
  const [reportLandUse, setReportLandUse] = useState('All');
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      await downloadPdfReport({
        scenario,
        growthRate,
        projectionYears,
        landUse: reportLandUse,
      });
    } catch (e) {
      alert(e?.message || 'Could not generate the PDF. Is the backend running and are you logged in?');
    } finally {
      setExportLoading(false);
    }
  }, [scenario, growthRate, projectionYears, reportLandUse]);
  
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
          exportLoading={exportLoading}
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
            setReportLandUse,
            handleExport
          }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
