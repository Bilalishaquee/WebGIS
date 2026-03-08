# Consumption estimation model: Cp = Pp * Ld (optional: * Kl)
# All values in liters (L). Frontend converts to m³ for display (divide by 1000).

L_PER_CAPITA_90 = 90
L_PER_CAPITA_100 = 100
# Optional land-use coefficients (proposal)
LAND_USE_COEFFICIENT = {
    "Residential": 1.0,
    "Commercial": 1.2,
    "Mixed-use": 1.1,
}


def parcel_daily_consumption(population: int, l_per_capita: int, land_use: str) -> float:
    """Cp = Pp * Ld * Kl"""
    k = LAND_USE_COEFFICIENT.get(land_use, 1.0)
    return population * l_per_capita * k


def parcel_yearly_consumption(population: int, l_per_capita: int, land_use: str) -> float:
    return parcel_daily_consumption(population, l_per_capita, land_use) * 365


def compute_parcel_consumption(population: int, land_use: str):
    """Return daily90, daily100, yearly90, yearly100 in liters."""
    daily90 = parcel_daily_consumption(population, L_PER_CAPITA_90, land_use)
    daily100 = parcel_daily_consumption(population, L_PER_CAPITA_100, land_use)
    return {
        "daily90": daily90,
        "daily100": daily100,
        "yearly90": daily90 * 365,
        "yearly100": daily100 * 365,
    }
