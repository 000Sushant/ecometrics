import { parseWorldBankEmissions } from '../src/main/server';

describe('parseWorldBankEmissions', () => {
  it('returns null when the payload is not an array', () => {
    expect(parseWorldBankEmissions({ error: 'nope' })).toBeNull();
  });

  it('returns null when the payload is missing the data array', () => {
    expect(parseWorldBankEmissions([{ page: 1 }])).toBeNull();
  });

  it('returns null when the second element is not an array', () => {
    expect(parseWorldBankEmissions([{ page: 1 }, 'not-an-array'])).toBeNull();
  });

  it('parses records, drops invalid rows, and projects missing recent years', () => {
    const json = [
      { page: 1 },
      [
        { date: '2009', value: '40000000' }, // dropped: year < 2010
        { date: '2015', value: null }, // dropped: NaN emissions
        { date: '2017', value: '35800000' }, // 35.8 Gt
        { date: '2018', value: '36400000' }, // 36.4 Gt
      ],
    ];

    const result = parseWorldBankEmissions(json);

    expect(result).not.toBeNull();
    expect(result!.some((p) => p.year === 2009)).toBe(false);
    expect(result!.some((p) => p.year === 2015)).toBe(false);
    expect(result![0]).toEqual({ year: 2017, emissions: 35.8 });
    // Years 2019..2026 are projected (+0.15/yr from the latest real value).
    expect(result!.map((p) => p.year)).toEqual([2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    expect(result!.find((p) => p.year === 2019)!.emissions).toBeGreaterThan(36.4);
  });

  it('uses default seed values when no usable records exist', () => {
    const result = parseWorldBankEmissions([{ page: 1 }, []]);

    expect(result).not.toBeNull();
    // Projection seeded from defaults (2020 / 35.5) fills 2021..2026.
    expect(result!.map((p) => p.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026]);
    expect(result![0].emissions).toBeGreaterThan(35.5);
  });

  it('returns null when no projected year falls within 2017–2026', () => {
    const json = [{ page: 1 }, [{ date: '2030', value: '40000000' }]];
    expect(parseWorldBankEmissions(json)).toBeNull();
  });
});
