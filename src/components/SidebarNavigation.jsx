import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  BarChart3, 
  MessageSquare, 
  Building2, 
  Database, 
  Settings,
  Menu,
  X
} from 'lucide-react';

const SidebarNavigation = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/map', icon: MapPin, label: 'Map View' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
  ];
  
  const dataItems = [
    { path: '/parcels', icon: Building2, label: 'Parcels' },
    { path: '/data-sources', icon: Database, label: 'Data Sources' },
  ];
  
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  const NavLink = ({ item, active }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-200 group ${
          active 
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' 
            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        <Icon size={20} className={active ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
        {(!isCollapsed || isMobileOpen) && (
          <span className="text-sm font-medium">{item.label}</span>
        )}
      </Link>
    );
  };
  
  return (
    <>
      {/* Mobile Menu Button - Only show when sidebar is closed */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      )}
      
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        sidebar-gradient text-white h-screen fixed left-0 top-0 
        transition-all duration-300 z-40 flex flex-col
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {/* Close button for mobile */}
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            )}
            {(!isCollapsed || isMobileOpen) && (
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                NAVIGATION
              </h2>
            )}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} active={isActive(item.path)} />
          ))}
          
          {(!isCollapsed || isMobileOpen) && (
            <div className="mt-4 sm:mt-6 px-3 mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                DATA
              </h3>
            </div>
          )}
          
          {dataItems.map((item) => (
            <NavLink key={item.path} item={item} active={isActive(item.path)} />
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-700/50">
          <Link
            to="/settings"
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              location.pathname === '/settings'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <Settings size={20} />
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-sm font-medium">Settings</span>
            )}
          </Link>
        </div>
      </div>
    </>
  );
};

export default SidebarNavigation;
