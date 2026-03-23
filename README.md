# Neighborhood Water Demand Dashboard

A map-based WebGIS dashboard for **consumption analysis**, **predictions**, and **visualization** of water demand across ~360–400 parcels. It uses **estimated average daily consumption per person** (0.09–0.1 m³/c per day, standard values for informal urban areas), with no real monthly meter data.

See **[PROJECT_SPEC.md](./PROJECT_SPEC.md)** for the client brief and **[PROJECT_BRIEF_CHECKLIST.md](./PROJECT_BRIEF_CHECKLIST.md)** for how each requirement is implemented.

## Features

- **Consumption analysis**: Per-parcel and neighborhood totals; consumption by parcel category (residential/commercial/mixed-use)
- **Predictions**: Future water demand (population growth) and demand-trend views
- **Map-based dashboard**: Interactive map with parcel attributes and consumption distribution; forecast charts
- **AI Chat Assistant**: Q&A about total consumption, consumption by parcel type, growth projections, scenario comparisons
- **Data management**: Parcel table, filters, upload (Data Sources)
- **Settings**: Scenario (0.09 vs 0.1 m³/c), growth rate, projection years

## Tech Stack

- **React 18** - UI framework
- **React Router** - Navigation
- **Leaflet & React-Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons

## Installation

### Frontend

1. Install dependencies:
```bash
npm install
```

2. (Optional) Set API URL. Copy `.env.example` to `.env` and set `VITE_API_URL` if the API is not at `http://localhost:8000`.

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

### Backend (API)

The dashboard expects a FastAPI backend for data and auth. See **backend/README.md** for setup.

1. From project root:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python scripts/seed_sanmiguel.py   # seeds from WebGIS/San Miguel 2/ (or creates parcels if no data)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. Open API docs: http://localhost:8000/docs

- **Authentication**: Register and log in via the dashboard; the frontend stores the JWT and sends it on API requests.
- **Units**: All consumption values from the API are in liters; the UI displays **cubic meters (m³)**. Consumption is estimated from **population and land-use** using **0.09 and 0.1 m³/c per person per day** (informal urban standard).
- **Parcel editing**: Select a parcel on the map or in the Parcels table, click Edit, change attributes, and Save; the map and analytics update automatically.

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
│   └── consumption.js
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
- **Data Sources** (`/data-sources`) - Upload parcels (CSV/JSON); data comes from **WebGIS/San Miguel 2/** or uploads.

## Data and consumption model

- **Parcels**: Loaded from the API (database seeded from **WebGIS/San Miguel 2/** — see `data/README.md` — or from Data Sources → Upload). Attributes: parcel ID, land-use type, population, coordinates.
- **Consumption**: Estimated at parcel level as **population × m³/c per day × land-use coefficient** (0.09 or 0.1 m³/c; Residential 1.0, Commercial 1.2, Mixed-use 1.1). No real meter data.
- **Predictions**: Simple growth model (compound growth on total demand) and forecast chart; map overlay for growth scenario.

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
- Toggle between 0.09 m³/c and 0.1 m³/c scenarios
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
