import { ImpactReport } from '../../core/models/impact-report.model';

export type TopicFilter =
  | 'All'
  | 'Tech/AI'
  | 'Aviation & Energy'
  | 'Ecosystems & Tourism'
  | 'Climate & Policy';

export interface DashboardBrief extends ImpactReport {
  topic: Exclude<TopicFilter, 'All'>;
  leaderMove: string;
  actionNudge: string;
  votes: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  location: string;
  co2SavedKg: number;
  streak: number;
}

/** Illustrative modeled briefs shown before any live feed is fetched. */
export const MODELED_BRIEFS: DashboardBrief[] = [
  {
    id: 'report-mock-fifa-2026',
    articleId: 'fifa-2026',
    articleTitle:
      'FIFA World Cup 2026: Expansion to 48-team format sparks "most polluting ever" concerns',
    articleUrl: '#',
    carbonIntensity: 78,
    co2EquivalentKg: 245000,
    glacierMeltMm: 6.2,
    forestImpactSqM: -9800,
    explanation:
      'Massive logistical emissions from intercontinental travel across 16 host cities and fossil fuel-linked sponsorship dependencies.',
    category: 'Transport',
    analyzedAt: new Date().toISOString(),
    topic: 'Aviation & Energy',
    leaderMove:
      'Tournament organizers and host cities face mounting pressure to decarbonize transit, limit short-haul fan flights, and phase out fossil-linked corporate sponsorships.',
    actionNudge:
      'If attending, opt for multi-city train passes instead of domestic flights, and support campaigns urging sports bodies to cut carbon footprints.',
    votes: 112,
  },
  {
    id: 'report-mock-ai-data-center',
    articleId: 'ai-data-center',
    articleTitle: 'Global AI Data Center Expansion Faces Growing Public Resistance',
    articleUrl: '#',
    carbonIntensity: 84,
    co2EquivalentKg: 185000,
    glacierMeltMm: 4.7,
    forestImpactSqM: -7400,
    explanation:
      'High-intensity electricity consumption and large-scale water usage for cooling in already drought-prone and water-stressed regions.',
    category: 'Energy',
    analyzedAt: new Date().toISOString(),
    topic: 'Tech/AI',
    leaderMove:
      'Tech giants are forced to re-evaluate their grid demands, with local regulators demanding direct investment in new renewable capacity rather than relying on existing power grids.',
    actionNudge:
      'Support digital footprint reduction by cleaning cloud storage, opting for lighter model sizes where possible, and querying tech platforms on their green credentials.',
    votes: 95,
  },
  {
    id: 'report-mock-albania-wetlands',
    articleId: 'albania-wetlands',
    articleTitle: "Protests Erupt Over Luxury Resort Development in Albania's Protected Wetlands",
    articleUrl: '#',
    carbonIntensity: 72,
    co2EquivalentKg: 124000,
    glacierMeltMm: 3.1,
    forestImpactSqM: -4900,
    explanation:
      'Habitat destruction for protected bird species and removal of carbon-sequestering coastal vegetation for commercial infrastructure.',
    category: 'Deforestation',
    analyzedAt: new Date().toISOString(),
    topic: 'Ecosystems & Tourism',
    leaderMove:
      'Balkan conservation groups are suing developers, highlighting a global trend where governments bypass environmental safeguards to attract luxury tourism capital.',
    actionNudge:
      'Choose eco-certified accommodations, respect local wildlife guidelines, and avoid coastal developments built on reclaimed or protected wetlands.',
    votes: 78,
  },
  {
    id: 'report-mock-un-overshoot',
    articleId: 'un-overshoot',
    articleTitle: 'UN Marks World Environment Day 2026 with 1.5°C Overshoot Warning',
    articleUrl: '#',
    carbonIntensity: 90,
    co2EquivalentKg: 310000,
    glacierMeltMm: 7.8,
    forestImpactSqM: -12400,
    explanation:
      'Escalating heat-related mortality and crop failure risks due to cumulative greenhouse gas concentrations reaching historical highs.',
    category: 'General',
    analyzedAt: new Date().toISOString(),
    topic: 'Climate & Policy',
    leaderMove:
      'United Nations leaders are demanding immediate updates to national climate plans (NDCs) with binding timelines to phase out fossil fuels rather than relying on future offsets.',
    actionNudge:
      'Engage with local policy advocacy groups, vote for climate-conscious representatives, and support local climate resilience planning.',
    votes: 143,
  },
  {
    id: 'report-mock-energy-market',
    articleId: 'energy-market',
    articleTitle: 'Global Energy Market Shifts: Fossil Fuel Reliance vs. Renewable Transition',
    articleUrl: '#',
    carbonIntensity: 80,
    co2EquivalentKg: 215000,
    glacierMeltMm: 5.4,
    forestImpactSqM: -8600,
    explanation:
      'Short-term spikes in localized air pollution due to increased oil/gas production output to meet 2026 energy security demands.',
    category: 'Energy',
    analyzedAt: new Date().toISOString(),
    topic: 'Aviation & Energy',
    leaderMove:
      'Energy ministers are balancing short-term supply security with long-term carbon commitments, resulting in mixed signals that delay capital transition to clean energy.',
    actionNudge:
      'Switch to a community solar program, install energy-efficient heat pumps, or audit your home insulation to reduce direct energy reliance.',
    votes: 88,
  },
  {
    id: 'report-mock-airline-netzero',
    articleId: 'airline-netzero',
    articleTitle: 'Airline industry chiefs admit 2050 net zero goal is unlikely',
    articleUrl: '#',
    carbonIntensity: 85,
    co2EquivalentKg: 260000,
    glacierMeltMm: 6.6,
    forestImpactSqM: -10400,
    explanation:
      'Reliance on non-existent carbon-removal technologies and failure to reform global air traffic management systems.',
    category: 'Transport',
    analyzedAt: new Date().toISOString(),
    topic: 'Aviation & Energy',
    leaderMove:
      'Aviation executives call for massive state subsidies to scale up Sustainable Aviation Fuel (SAF) production, while environmental groups push for frequent-flyer levies.',
    actionNudge:
      'Limit non-essential air travel, select direct flights, and choose alternative travel modes like high-speed rail for regional trips.',
    votes: 127,
  },
  {
    id: 'report-mock-ai-water-land',
    articleId: 'ai-water-land',
    articleTitle: "AI's environmental costs threaten water, land and climate",
    articleUrl: '#',
    carbonIntensity: 82,
    co2EquivalentKg: 170000,
    glacierMeltMm: 4.3,
    forestImpactSqM: -6800,
    explanation:
      'High electricity demand and massive water-cooling requirements for global data centers, often in drought-prone regions.',
    category: 'Energy',
    analyzedAt: new Date().toISOString(),
    topic: 'Tech/AI',
    leaderMove:
      'Regulators are proposing mandatory disclosure of water consumption and energy efficiency metrics specifically targeting AI compute facilities.',
    actionNudge:
      'Optimize your API queries, prefer energy-efficient algorithms, and support data centers operating in regions with high renewable energy mix.',
    votes: 91,
  },
  {
    id: 'report-mock-protesters-albania',
    articleId: 'protesters-albania',
    articleTitle: 'Protesters call to halt luxury resort in protected Albanian wetlands',
    articleUrl: '#',
    carbonIntensity: 68,
    co2EquivalentKg: 110000,
    glacierMeltMm: 2.8,
    forestImpactSqM: -4400,
    explanation:
      'Habitat destruction of migratory flyways and removal of carbon-sequestering coastal vegetation for tourism infrastructure.',
    category: 'Deforestation',
    analyzedAt: new Date().toISOString(),
    topic: 'Ecosystems & Tourism',
    leaderMove:
      'Conservationists are staging sit-ins, urging the European Union to make environmental protection a key condition for regional funding and accession talks.',
    actionNudge:
      'Raise awareness of ecological corridors, support conservation NGOs, and sign petitions against zoning laws that permit wetland commercialization.',
    votes: 69,
  },
  {
    id: 'report-mock-el-nino',
    articleId: 'el-nino',
    articleTitle: 'NOAA declares start of El Niño climate phenomenon',
    articleUrl: '#',
    carbonIntensity: 88,
    co2EquivalentKg: 285000,
    glacierMeltMm: 7.2,
    forestImpactSqM: -11400,
    explanation:
      'Intensified extreme heatwaves and global temperature spikes, exacerbating pressure on food supplies and ecosystems.',
    category: 'General',
    analyzedAt: new Date().toISOString(),
    topic: 'Climate & Policy',
    leaderMove:
      'Disaster management authorities are calling for emergency funding and resource reallocation to handle crop failures, prolonged droughts, and critical water shortages.',
    actionNudge:
      'Adopt water-saving habits, establish native plant gardens that withstand drought, and prepare emergency plans for extreme heatwaves.',
    votes: 135,
  },
  {
    id: 'report-mock-sustainable-fuel',
    articleId: 'sustainable-fuel',
    articleTitle:
      'American Airlines and Google sign record-breaking sustainable aviation fuel deal',
    articleUrl: '#',
    carbonIntensity: 55,
    co2EquivalentKg: 95000,
    glacierMeltMm: 2.4,
    forestImpactSqM: -3800,
    explanation:
      'Industrial-scale production of SAF from waste feedstocks, aiming to reduce lifecycle emissions compared to conventional jet fuel.',
    category: 'Transport',
    analyzedAt: new Date().toISOString(),
    topic: 'Aviation & Energy',
    leaderMove:
      'Corporate alliances are scaling up fuel procurement contracts, creating a market signal to incentivize capital investment in biorefineries.',
    actionNudge:
      'Advocate for corporate travel guidelines that require sustainable fuel offsets and monitor lifecycle carbon claims of new fuels.',
    votes: 104,
  },
  {
    id: 'report-mock-irminger-sea',
    articleId: 'irminger-sea',
    articleTitle: 'US government plans to dismantle Irminger Sea ocean moorings',
    articleUrl: '#',
    carbonIntensity: 75,
    co2EquivalentKg: 140000,
    glacierMeltMm: 3.5,
    forestImpactSqM: -5600,
    explanation:
      'Loss of critical data on the Atlantic Meridional Overturning Circulation (AMOC), impacting climate predictability for Europe.',
    category: 'General',
    analyzedAt: new Date().toISOString(),
    topic: 'Ecosystems & Tourism',
    leaderMove:
      'Oceanographers and policy groups are warning that funding cuts to marine observation will blind climate modeling at a time when AMOC destabilization risks are rising.',
    actionNudge:
      'Support public funding for climate science, read open-access research papers on ocean health, and write to elected officials urging preservation of monitoring stations.',
    votes: 82,
  },
];

/** Static "Green Champions" leaderboard (illustrative, ranked by weekly CO2 saved). */
export const LEADERBOARD: ReadonlyArray<LeaderboardEntry> = [
  { rank: 1, name: 'Aria Nakamura', location: 'Kyoto', co2SavedKg: 64.2, streak: 28 },
  { rank: 2, name: "Liam O'Brien", location: 'Dublin', co2SavedKg: 58.9, streak: 21 },
  { rank: 3, name: 'Zara Okafor', location: 'Lagos', co2SavedKg: 52.4, streak: 19 },
  { rank: 4, name: 'Noah Schmidt', location: 'Berlin', co2SavedKg: 41.0, streak: 12 },
  { rank: 5, name: 'Mateo Rossi', location: 'Milan', co2SavedKg: 37.6, streak: 9 },
];

/** The current user, sitting far down the global ranking. */
export const CURRENT_USER_RANK: LeaderboardEntry = {
  rank: 11453,
  name: 'You',
  location: 'Your City',
  co2SavedKg: 8.4,
  streak: 3,
};
