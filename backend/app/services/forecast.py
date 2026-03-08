# Predictive modeling: Pt = P0 * (1+r)^t, Ct = Pt * Ld
# Growth projection and forecast data.


def project_population(p0: int, r_percent: float, t_years: int) -> float:
    """Pt = P0 * (1 + r)^t"""
    r = r_percent / 100.0
    return p0 * ((1 + r) ** t_years)


def project_demand(base_yearly_90: float, base_yearly_100: float, growth_rate_percent: float, years: int) -> list[dict]:
    """Return list of { year, year90, year100 } for year 0..years (in liters)."""
    data = []
    for i in range(years + 1):
        factor = (1 + growth_rate_percent / 100) ** i
        data.append({
            "year": "Year 0" if i == 0 else f"Year {i}",
            "year90": base_yearly_90 * factor,
            "year100": base_yearly_100 * factor,
        })
    return data
