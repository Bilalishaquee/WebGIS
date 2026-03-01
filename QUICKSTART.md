# Quick Start Guide

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

3. **Build for Production**
   ```bash
   npm run build
   ```

## Features Overview

### 🗺️ Dashboard Page (`/`)
- Interactive map with 380 parcels
- Color-coded consumption levels
- Real-time analytics panel
- Scenario toggling (90L/c vs 100L/c)
- Growth rate and projection controls

### 📊 Analytics Page (`/analytics`)
- Summary metrics cards
- Land-use breakdown pie chart
- 5-year demand forecast
- Scenario comparison charts

### 💬 Chat Page (`/chat`)
- AI assistant interface
- Suggested questions
- Interactive Q&A

### 📋 Parcels Page (`/parcels`)
- Searchable data table
- Filter by land-use type
- Pagination (25 items per page)
- All 380 parcels with detailed data

### ⚙️ Settings Page (`/settings`)
- General configuration
- Map settings toggles
- Notification preferences

### 📁 Data Sources Page (`/data-sources`)
- Data source management
- Connection status
- Update information

## Key Interactions

1. **Change Scenario**: Click "90 L/c" or "100 L/c" buttons in header
2. **Adjust Growth Rate**: Modify the growth percentage input
3. **Filter Parcels**: Use dropdowns to filter by land-use type
4. **Search Parcels**: Type parcel ID in search box on Parcels page
5. **View Map Details**: Hover over map markers to see parcel information

## Data Structure

- **380 Parcels**: Generated with random population (2-15 per parcel)
- **Land-Use Types**: Residential, Commercial, Mixed-use
- **Consumption Calculation**: Population × Scenario (90L or 100L)
- **Forecast**: Based on growth rate and projection years

## Customization

All data is generated using mock functions in `src/utils/mockData.js`. To connect real data:

1. Replace `generateParcels()` with your API call
2. Update `calculateSummaryMetrics()` to use real calculations
3. Modify chart data sources in `AnalyticsPanel.jsx`

## Browser Requirements

- Modern browser with ES6+ support
- JavaScript enabled
- Minimum screen width: 320px (mobile)
- Recommended: 1920x1080 (desktop)
