import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Chat from './pages/Chat';
import Parcels from './pages/Parcels';
import Settings from './pages/Settings';
import DataSources from './pages/DataSources';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapView />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="chat" element={<Chat />} />
          <Route path="parcels" element={<Parcels />} />
          <Route path="settings" element={<Settings />} />
          <Route path="data-sources" element={<DataSources />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
