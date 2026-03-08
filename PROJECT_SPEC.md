# Project specification (client brief)

This document records the client requirements that the WebGIS dashboard is built to satisfy.

---

## Base dataset

- A **map with all polygons** (around **360–400 parcels**).
- Each parcel includes:
  - **Parcel ID**
  - **Land-use type** (residential / commercial / etc.)
  - **Number of people per parcel**
- We **do not have real monthly water consumption data**. We use an **estimated average daily water consumption per person** (liters per person per day), based on standard values for **informal urban areas** (around **90 and 100 L/person per day**).

---

## 1. Consumption analysis

We need an **algorithm** that can **estimate and distribute total water consumption at parcel level** using the available attributes (number of people per parcel and land-use type).

Goals:

- **Water consumption per parcel**
- **Aggregated total consumption for the neighborhood**
- **Possible consumption differences between parcel categories**

---

## 2. Predictions

We want **simple predictive models** for:

- **Estimated future water consumption** (based on population growth assumptions)
- **Possible future growth or changes in the polygon** (urban expansion / parcel demand trends)

These models do not need to be extremely complex — just **meaningful insights** based on the available data.

---

## 3. Visualization

We need a **map-based dashboard or WebGIS** where we can:

- **Visualize the polygons and their attributes**
- **See estimated consumption distribution per parcel**
- **View predictions** of both consumption and potential growth

---

## 4. Chatbot integration

A **simple AI-powered chatbot** integrated into the dashboard that can answer questions about the data and results, such as:

- **Total estimated consumption**
- **Consumption by parcel type**
- **Growth projections**
- **Comparisons between scenarios**

---

## Implementation

How each requirement is implemented is documented in **[PROJECT_BRIEF_CHECKLIST.md](./PROJECT_BRIEF_CHECKLIST.md)**.

Data source: parcels come from the database, seeded from the **San Miguel 2** folder (or uploaded via the app). Consumption and forecasts use **90 and 100 L/person/day** and land-use coefficients.
