# Neighborhood Water Demand Dashboard

A professional, modern, data-driven WebGIS dashboard for analyzing water consumption across 360-400 parcels using spatial data and forecasting models.

## Features

- **Interactive Map View**: Leaflet-based map with parcel-level visualization and color-coded consumption levels
- **Analytics Dashboard**: Comprehensive metrics, charts, and forecasts
- **Data Management**: Parcel data table with search and filtering
- **AI Chat Assistant**: Interactive Q&A interface for water demand queries
- **Scenario Comparison**: Compare different consumption scenarios (90L/c vs 100L/c)
- **Forecast Visualization**: 5-year projection with growth rate adjustments
- **Settings Management**: Configurable dashboard settings

## Tech Stack

- **React 18** - UI framework
- **React Router** - Navigation
- **Leaflet & React-Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── SidebarNavigation.jsx
│   ├── HeaderBar.jsx
│   ├── DashboardLayout.jsx
│   ├── MapPanel.jsx
│   └── AnalyticsPanel.jsx
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── MapView.jsx
│   ├── Analytics.jsx
│   ├── Chat.jsx
│   ├── Parcels.jsx
│   ├── Settings.jsx
│   └── DataSources.jsx
├── utils/              # Utility functions
│   └── mockData.js
├── App.jsx             # Main app component
├── main.jsx            # Entry point
└── index.css           # Global styles
```

## Pages

- **Dashboard** (`/`) - Main view with map and analytics side-by-side
- **Map View** (`/map`) - Full-screen interactive map
- **Analytics** (`/analytics`) - Detailed analytics and charts
- **Chat** (`/chat`) - AI assistant interface
- **Parcels** (`/parcels`) - Data table with search and filters
- **Settings** (`/settings`) - Configuration options
- **Data Sources** (`/data-sources`) - Data source management

## Mock Data

The application uses generated mock data for 380 parcels with:
- Random population (2-15 per parcel)
- Mixed land-use types (Residential, Commercial, Mixed-use)
- Calculated consumption based on scenarios (90L/c and 100L/c)
- Geographic coordinates for map visualization

## Features in Detail

### Map Features
- Color-coded consumption levels (Low, Medium, High, Critical)
- Interactive tooltips on hover
- Land-use filtering
- Zoom controls
- Legend display

### Analytics Features
- Summary metrics (Daily, Monthly, Yearly demand, Population)
- Land-use breakdown pie chart
- 5-year demand forecast with growth projections
- Scenario comparison bar chart

### Data Table Features
- Search by parcel ID
- Filter by land-use type
- Pagination (25 items per page)
- Sortable columns
- Responsive design

## Customization

### Scenario Settings
- Toggle between 90L/c and 100L/c scenarios
- Adjust growth rate (0-10%)
- Set projection years (1-5 years)

### Map Settings
- Show/hide consumption legend
- Enable/disable parcel tooltips
- Cluster markers at low zoom

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
