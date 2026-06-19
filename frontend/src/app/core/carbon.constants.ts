/**
 * Modeled factors that translate a CO₂-equivalent (kg) into the human-scale
 * comparisons shown across the dashboard. Centralized so the impact cards and the
 * aggregate KPIs stay in sync.
 */

/** Oxygen a single person consumes in a year, expressed as kg of CO₂-equivalent. */
export const PERSON_OXYGEN_KG_CO2_PER_YEAR = 15.3;

/** Modeled litres of glacier melt per kg of CO₂. */
export const GLACIER_MELT_LITRES_PER_KG = 3;

/** Volume of an Olympic swimming pool, in litres. */
export const OLYMPIC_POOL_LITRES = 2_500_000;

/** Annual cooling offset of one city park, expressed as kg of CO₂-equivalent. */
export const CITY_PARK_KG_CO2 = 36_800;

/** Emissions from one year of car commuting, in kg of CO₂. */
export const COMMUTE_YEAR_KG_CO2 = 525.7;

export const COMMUTE_KG_PER_KM = 0.21;
export const DIET_WEEKLY_KG = { meat: 50, average: 35, vegetarian: 24, vegan: 18 } as const;
export const ENERGY_WEEKLY_KG = { grid: 40, mixed: 25, renewable: 8 } as const;
export const AVERAGE_WEEKLY_KG = 130;

