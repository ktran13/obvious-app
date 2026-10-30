/**
 * Curated seed data — hand-written fixture sets, not scraped content.
 *
 * Demo seeds use placeholder canonical/apply URLs under example.org (the
 * IANA-reserved documentation domain) so no invented real-world link ships
 * in the database. Templates are expanded deterministically by expand.ts:
 * same inputs → same external ids → idempotent re-runs.
 */
import type { InterestSlug, PersonaSlug } from "./taxonomy";

export interface EventTemplate {
  slug: string;
  title: string;
  description: string;
  priceType: "free" | "paid" | "unknown";
  /** Cents; set for paid templates. */
  priceMin?: number;
  priceMax?: number;
  interests: InterestSlug[];
  personas: PersonaSlug[];
  /** ISO weekdays (1=Mon … 7=Sun) the series recurs on, each week. */
  slots: number[];
  startHour: number;
  startMinute: number;
  /** Hours the event runs. */
  durationHours: number;
}

/**
 * 40 recurring series — 4 per interest category. Expansion schedules each on
 * its slots for six future weeks, rotating neighborhoods, which yields
 * several hundred future-dated events covering every interest, persona, and
 * neighborhood.
 */
export const EVENT_TEMPLATES: EventTemplate[] = [
  // tech
  { slug: "tech-civic-hack-night", title: "Civic Hack Night", description: "Open working session on open-data tooling for NYC; laptops provided, all skill levels welcome.", priceType: "free", interests: ["tech", "community"], personas: ["professionals", "students"], slots: [2, 4], startHour: 18, startMinute: 30, durationHours: 3 },
  { slug: "tech-frontend-study-group", title: "Frontend Study Group", description: "Structured walk-throughs of modern web patterns; bring a project or pair up.", priceType: "free", interests: ["tech", "learning"], personas: ["students"], slots: [1, 3], startHour: 19, startMinute: 0, durationHours: 2 },
  { slug: "tech-ai-builders-demo", title: "AI Builders Demo Night", description: "Five-minute demos from local builders, followed by structured feedback.", priceType: "paid", priceMin: 1000, priceMax: 1500, interests: ["tech"], personas: ["professionals"], slots: [3], startHour: 18, startMinute: 0, durationHours: 2 },
  { slug: "tech-women-in-engineering", title: "Women in Engineering Mixer", description: "Panel and networking for women and allies in NYC engineering teams.", priceType: "free", interests: ["tech"], personas: ["female", "professionals"], slots: [2], startHour: 18, startMinute: 30, durationHours: 2 },
  // arts
  { slug: "arts-open-studio-drawing", title: "Open Studio: Figure Drawing", description: "Untaught life-drawing session with a model; basic supplies available.", priceType: "paid", priceMin: 1500, priceMax: 2000, interests: ["arts"], personas: ["students"], slots: [1, 6], startHour: 18, startMinute: 0, durationHours: 2 },
  { slug: "arts-gallery-crawl", title: "Lower Manhattan Gallery Crawl", description: "Guided walk past six current exhibitions; route posted at the meeting point.", priceType: "free", interests: ["arts"], personas: ["newcomers"], slots: [5], startHour: 17, startMinute: 30, durationHours: 2 },
  { slug: "arts-zine-workshop", title: "Zine-Making Workshop", description: "Fold, cut, and staple your first zine; materials included.", priceType: "paid", priceMin: 800, interests: ["arts", "learning"], personas: ["students", "female"], slots: [7], startHour: 14, startMinute: 0, durationHours: 2 },
  { slug: "arts-queens-craft-circle", title: "Craft Circle", description: "Bring a handcraft and sit with neighbors; tea provided.", priceType: "free", interests: ["arts", "community"], personas: ["seniors"], slots: [3], startHour: 13, startMinute: 0, durationHours: 2 },
  // music
  { slug: "music-rooftop-jazz-set", title: "Rooftop Jazz Set", description: "Local quartet plays two sets on the rooftop; cash bar.", priceType: "paid", priceMin: 2000, priceMax: 2000, interests: ["music"], personas: ["professionals"], slots: [5], startHour: 19, startMinute: 30, durationHours: 2 },
  { slug: "music-community-choir-rehearsal", title: "Community Choir Rehearsal", description: "No audition; songbooks provided; new voices always welcome.", priceType: "free", interests: ["music", "community"], personas: ["seniors", "newcomers"], slots: [2], startHour: 19, startMinute: 0, durationHours: 2 },
  { slug: "music-vinyl-listening-club", title: "Vinyl Listening Club", description: "This month's record played front to back on a proper sound system.", priceType: "unknown", interests: ["music"], personas: [], slots: [6], startHour: 16, startMinute: 0, durationHours: 2 },
  { slug: "music-family-singalong", title: "Family Singalong", description: "Classic children's songs with a live guitarist; stroller space available.", priceType: "free", interests: ["music", "family"], personas: ["kids"], slots: [7], startHour: 10, startMinute: 30, durationHours: 1 },
  // food
  { slug: "food-night-market-walk", title: "Night Market Food Walk", description: "Guided walk of street-food blocks; bring small bills.", priceType: "unknown", interests: ["food"], personas: ["newcomers", "students"], slots: [5], startHour: 18, startMinute: 30, durationHours: 2 },
  { slug: "food-soup-making-coop", title: "Soup-Making Co-op", description: "Batch-cook for the community fridge; prep and packaging included.", priceType: "free", interests: ["food", "community"], personas: ["students"], slots: [7], startHour: 11, startMinute: 0, durationHours: 3 },
  { slug: "food-bagel-crawl", title: "Bagel Crawl: Three Boroughs", description: "Compare one classic bagel per borough; walking distance between stops is short.", priceType: "paid", priceMin: 2500, priceMax: 2500, interests: ["food"], personas: ["newcomers", "dog-owners"], slots: [6], startHour: 9, startMinute: 30, durationHours: 2 },
  { slug: "food-home-winetasting", title: "Home Winetasting Basics", description: "Six bottles, one theme, no jargon; over-21 only.", priceType: "paid", priceMin: 3000, priceMax: 3500, interests: ["food"], personas: ["professionals", "female"], slots: [4], startHour: 19, startMinute: 0, durationHours: 2 },
  // outdoors
  { slug: "outdoors-sunrise-run-club", title: "Sunrise Run Club", description: "Easy-pace 5K; all speeds, nobody dropped; coffee after.", priceType: "free", interests: ["outdoors", "wellness"], personas: ["professionals", "dog-owners"], slots: [2, 4, 6], startHour: 6, startMinute: 30, durationHours: 1 },
  { slug: "outdoors-bridge-walk", title: "Bridge-to-Bridge Walk", description: "Six-mile urban hike with history stops; metrocard return.", priceType: "free", interests: ["outdoors"], personas: ["newcomers"], slots: [7], startHour: 9, startMinute: 0, durationHours: 4 },
  { slug: "outdoors-community-garden-hour", title: "Community Garden Hour", description: "Seasonal bed maintenance; gloves and tools provided.", priceType: "free", interests: ["outdoors", "community"], personas: ["kids", "seniors"], slots: [3], startHour: 16, startMinute: 0, durationHours: 2 },
  { slug: "outdoors-kayak-basics", title: "Free Kayak Basics", description: "Twenty-minute supervised paddles; sign-up sheet on site.", priceType: "free", interests: ["outdoors", "family"], personas: ["kids", "students"], slots: [6], startHour: 10, startMinute: 0, durationHours: 4 },
  // wellness
  { slug: "wellness-park-yoga", title: "Park Yoga", description: "All-levels vinyasa on the lawn; bring a mat.", priceType: "free", interests: ["wellness"], personas: ["female", "professionals"], slots: [2, 6], startHour: 8, startMinute: 0, durationHours: 1 },
  { slug: "wellness-sit-and-stretch", title: "Sit & Stretch for Seniors", description: "Gentle chair-based movement followed by social hour.", priceType: "free", interests: ["wellness"], personas: ["seniors"], slots: [1, 3], startHour: 11, startMinute: 0, durationHours: 1 },
  { slug: "wellness-meditation-sit", title: "Silent Meditation Sit", description: "Two 20-minute sits with brief guidance; cushions provided.", priceType: "unknown", interests: ["wellness"], personas: ["professionals"], slots: [3, 5], startHour: 18, startMinute: 15, durationHours: 1 },
  { slug: "wellness-newcomer-walk-talk", title: "Walk & Talk for Newcomers", description: "Casual loop walk to meet other new arrivals; dog-friendly route.", priceType: "free", interests: ["wellness", "community"], personas: ["newcomers", "dog-owners"], slots: [7], startHour: 15, startMinute: 0, durationHours: 2 },
  // community
  { slug: "community-fridge-sort", title: "Community Fridge Sort", description: "Sort donations and restock shelves; closed-toe shoes required.", priceType: "free", interests: ["community"], personas: ["students"], slots: [6], startHour: 10, startMinute: 0, durationHours: 2 },
  { slug: "community-neighborhood-cleanup", title: "Neighborhood Cleanup", description: "Gloves, bags, and grabbers provided; coffee and snacks at noon.", priceType: "free", interests: ["community", "outdoors"], personas: ["kids", "lgbtq"], slots: [7], startHour: 9, startMinute: 30, durationHours: 3 },
  { slug: "community-queer-coffee-morning", title: "Queer Coffee Morning", description: "Drop-in social for LGBTQ neighbors and friends.", priceType: "free", interests: ["community"], personas: ["lgbtq"], slots: [1], startHour: 10, startMinute: 0, durationHours: 2 },
  { slug: "community-tenant-rights-table", title: "Tenant Rights Info Table", description: "Volunteer-run info table; learn your rights, meet neighbors.", priceType: "free", interests: ["community", "learning"], personas: ["newcomers", "female"], slots: [4], startHour: 17, startMinute: 30, durationHours: 2 },
  // family
  { slug: "family-storytime", title: "Library Storytime", description: "Picture-book reading for ages 2-6 with songs; free.", priceType: "free", interests: ["family", "learning"], personas: ["kids"], slots: [2, 4], startHour: 10, startMinute: 30, durationHours: 1 },
  { slug: "family-playground-meetup", title: "Playground Meetup", description: "Meet other caregivers; snacks and coffee brought by volunteers.", priceType: "free", interests: ["family"], personas: ["kids", "female"], slots: [3, 6], startHour: 15, startMinute: 30, durationHours: 2 },
  { slug: "family-stroller-walk", title: "Stroller Walk", description: "Flat, stroller-friendly loop at stroller pace.", priceType: "free", interests: ["family", "outdoors"], personas: ["kids", "dog-owners"], slots: [5], startHour: 10, startMinute: 0, durationHours: 1 },
  { slug: "family-kids-science-lab", title: "Kids' Science Lab", description: "Hands-on experiments for ages 5-10; caregiver must stay.", priceType: "paid", priceMin: 500, priceMax: 800, interests: ["family", "learning"], personas: ["kids", "students"], slots: [7], startHour: 12, startMinute: 0, durationHours: 2 },
  // learning
  { slug: "learning-esl-conversation-circle", title: "ESL Conversation Circle", description: "Practice English in small groups; all levels welcome.", priceType: "free", interests: ["learning"], personas: ["newcomers"], slots: [2, 5], startHour: 18, startMinute: 0, durationHours: 2 },
  { slug: "learning-city-history-talk", title: "NYC History Talk", description: "Local historians on how this neighborhood got built.", priceType: "unknown", interests: ["learning"], personas: ["seniors"], slots: [3], startHour: 18, startMinute: 30, durationHours: 1 },
  { slug: "learning-coding-for-beginners", title: "Coding for Absolute Beginners", description: "Bring a laptop; leave with your first webpage.", priceType: "free", interests: ["learning", "tech"], personas: ["students", "newcomers"], slots: [6], startHour: 14, startMinute: 0, durationHours: 3 },
  { slug: "learning-personal-finance-basics", title: "Personal Finance Basics", description: "Budgeting, credit, and rent; no products sold.", priceType: "free", interests: ["learning"], personas: ["professionals", "students"], slots: [1], startHour: 18, startMinute: 30, durationHours: 2 },
  // film
  { slug: "film-rooftop-screening", title: "Rooftop Film Screening", description: "Classic NYC films under the stars; blankets available to borrow.", priceType: "paid", priceMin: 1200, priceMax: 1200, interests: ["film"], personas: ["professionals", "female"], slots: [5], startHour: 19, startMinute: 45, durationHours: 3 },
  { slug: "film-doc-club", title: "Documentary Club", description: "Watch a short doc, then discuss with the filmmaker.", priceType: "free", interests: ["film", "learning"], personas: ["students", "lgbtq"], slots: [4], startHour: 19, startMinute: 0, durationHours: 2 },
  { slug: "film-family-matinee", title: "Family Matinee", description: "Animated shorts for all ages; lights stay on low.", priceType: "free", interests: ["film", "family"], personas: ["kids"], slots: [6], startHour: 11, startMinute: 0, durationHours: 2 },
  { slug: "film-queer-cinema-night", title: "Queer Cinema Night", description: "Contemporary LGBTQ films followed by open discussion.", priceType: "unknown", interests: ["film"], personas: ["lgbtq"], slots: [2], startHour: 19, startMinute: 30, durationHours: 3 },
];

/** One representative venue per neighborhood — kept simple for demo data. */
export const VENUE_BY_NEIGHBORHOOD: Record<string, string> = {
  "upper-east-side": "Carl Schurz Park Hall",
  "east-village": "First Run Collective Space",
  harlem: "Abyssinian Meeting Room",
  chelsea: "Hudson Guild Hall",
  soho: "Prince Street Studio",
  bushwick: "The Bushwick Project Space",
  "park-slope": "Old Stone House Grounds",
  williamsburg: "North Brooklyn Consolidated",
  "sunset-park": "Industry City Commons",
  "brooklyn-heights": "Pier 1 Harbor Room",
  astoria: "The Queens Kickshaw Back Room",
  "long-island-city": "LIC Landing",
  "downtown-flushing": "Lippo Centre Meeting Hall",
  "jackson-heights": "The Community Room at 82nd",
  "south-bronx": "The Bronx Republic Hall",
  riverdale: "Van Cortlandt House Lawn",
  "st-george": "Staten Island ferryside Pavilion",
};

export interface CommunitySeed {
  slug: string;
  name: string;
  description: string;
}

/** Organizer/community pages the later directory screen consumes. */
export const COMMUNITIES: CommunitySeed[] = [
  { slug: "nyc-civic-tech", name: "NYC Civic Tech", description: "Volunteers building open-data tools for city services." },
  { slug: "brooklyn-frontend-guild", name: "Brooklyn Frontend Guild", description: "Study group and demo nights for web developers." },
  { slug: "astoria-games", name: "Astoria Board Gamers", description: "Weekly open-play board game sessions in Western Queens." },
  { slug: "harlem-history-circle", name: "Harlem History Circle", description: "Talks and walks on Uptown history, run by neighbors." },
  { slug: "queens-newcomers-network", name: "Queens Newcomers Network", description: "Mutual-help community for new New Yorkers." },
  { slug: "bk-queer-social", name: "Brooklyn Queer Social", description: "Drop-in coffee mornings and film nights." },
  { slug: "sunset-park-runners", name: "Sunset Park Runners", description: "All-pace running club with sunrise and weekend runs." },
  { slug: "staten-environmental-coalition", name: "Staten Island Environmental Coalition", description: "Cleanups, garden hours, and shore walks." },
  { slug: "flushing-food-walks", name: "Flushing Food Walks", description: "Neighborhood-led tours of the Night Market and side streets." },
  { slug: "lic-student-collective", name: "LIC Student Collective", description: "Study halls, zine nights, and museum trips." },
  { slug: "bronx-outdoors", name: "Bronx Outdoors", description: "Hikes, kayak days, and park stewardship." },
  { slug: "chelsea-wellness-coop", name: "Chelsea Wellness Co-op", description: "Free yoga, meditation sits, and senior movement classes." },
  { slug: "upper-east-parents", name: "Upper East Parents Network", description: "Storytime meetups, stroller walks, and caregiver swaps." },
  { slug: "east-village-artists", name: "East Village Artists Collective", description: "Open studio sessions and gallery crawls." },
  { slug: "williamsburg-vinyl-club", name: "Williamsburg Vinyl Club", description: "Monthly listening sessions and record swaps." },
  { slug: "jackson-heights-esl", name: "Jackson Heights ESL Circle", description: "Volunteer-run conversation circles twice weekly." },
  { slug: "riverdale-seniors", name: "Riverdale Seniors Club", description: "Social hours, tech help, and gentle exercise." },
  { slug: "park-slope-family-lab", name: "Park Slope Family Lab", description: "Hands-on science and maker sessions for kids." },
  { slug: "soho-doc-club", name: "SoHo Documentary Club", description: "Short docs and filmmaker Q&As." },
  { slug: "brooklyn-heights-finance-circle", name: "Brooklyn Heights Finance Circle", description: "Plain-language personal finance workshops." },
  { slug: "south-bronx-tenant-org", name: "South Bronx Tenant Organizers", description: "Know-your-rights tables and building meetings." },
  { slug: "nyc-dog-owners-alliance", name: "NYC Dog Owners Alliance", description: "Dog-friendly walks and park advocacy." },
  { slug: "curated-editorial", name: "Curated Editorial Team", description: "The small editorial team maintaining these listings." },
  { slug: "freenyc-volunteers", name: "FreeNYC Volunteers", description: "Volunteers maintaining the free-events CSV drop." },
];
/**
 * Curated attribution: which seeded community runs each recurring event
 * series. The community directory and detail pages aggregate a community's
 * upcoming events through the matching `community:<slug>` tag that expand.ts
 * writes — the same organizer-tagged mechanism real sources will use.
 *
 * A few communities (astoria-games, curated-editorial, freenyc-volunteers)
 * host no seeded series and render with an empty upcoming list.
 */
export const TEMPLATE_COMMUNITIES: Record<string, string> = {
  "tech-civic-hack-night": "nyc-civic-tech",
  "tech-frontend-study-group": "brooklyn-frontend-guild",
  "tech-ai-builders-demo": "brooklyn-frontend-guild",
  "tech-women-in-engineering": "brooklyn-frontend-guild",
  "arts-open-studio-drawing": "east-village-artists",
  "arts-gallery-crawl": "east-village-artists",
  "arts-zine-workshop": "lic-student-collective",
  "arts-queens-craft-circle": "riverdale-seniors",
  "music-rooftop-jazz-set": "williamsburg-vinyl-club",
  "music-community-choir-rehearsal": "riverdale-seniors",
  "music-vinyl-listening-club": "williamsburg-vinyl-club",
  "music-family-singalong": "upper-east-parents",
  "food-night-market-walk": "flushing-food-walks",
  "food-soup-making-coop": "flushing-food-walks",
  "food-bagel-crawl": "nyc-dog-owners-alliance",
  "food-home-winetasting": "queens-newcomers-network",
  "outdoors-sunrise-run-club": "sunset-park-runners",
  "outdoors-bridge-walk": "bronx-outdoors",
  "outdoors-community-garden-hour": "staten-environmental-coalition",
  "outdoors-kayak-basics": "bronx-outdoors",
  "wellness-park-yoga": "chelsea-wellness-coop",
  "wellness-sit-and-stretch": "chelsea-wellness-coop",
  "wellness-meditation-sit": "chelsea-wellness-coop",
  "wellness-newcomer-walk-talk": "queens-newcomers-network",
  "community-fridge-sort": "south-bronx-tenant-org",
  "community-neighborhood-cleanup": "staten-environmental-coalition",
  "community-queer-coffee-morning": "bk-queer-social",
  "community-tenant-rights-table": "south-bronx-tenant-org",
  "family-storytime": "upper-east-parents",
  "family-playground-meetup": "upper-east-parents",
  "family-stroller-walk": "upper-east-parents",
  "family-kids-science-lab": "park-slope-family-lab",
  "learning-esl-conversation-circle": "jackson-heights-esl",
  "learning-city-history-talk": "harlem-history-circle",
  "learning-coding-for-beginners": "lic-student-collective",
  "learning-personal-finance-basics": "brooklyn-heights-finance-circle",
  "film-rooftop-screening": "soho-doc-club",
  "film-doc-club": "soho-doc-club",
  "film-family-matinee": "park-slope-family-lab",
  "film-queer-cinema-night": "bk-queer-social",
};

export interface JobSeed {
  title: string;
  company: string;
  description: string;
  applyUrl: string;
  interestSlug: InterestSlug;
  /** Days before the seed run that the posting went up. */
  postedDaysAgo: number;
}

/**
 * Entry-level and community-adjacent roles for the jobs board — one per
 * interest minimum, keyed by applyUrl for idempotent seeding.
 */
export const JOB_POSTINGS: JobSeed[] = [
  { title: "Junior Frontend Engineer", company: "Bodega Labs", description: "Build customer-facing React surfaces for a neighborhood logistics tool.", applyUrl: "https://example.org/jobs/bodega-frontend", interestSlug: "tech", postedDaysAgo: 2 },
  { title: "Data Analyst, Open Records", company: "City Bureau Press", description: "Analyze NYC open-data extracts for public-interest reporting.", applyUrl: "https://example.org/jobs/citybureau-analyst", interestSlug: "tech", postedDaysAgo: 5 },
  { title: "Gallery Assistant", company: "Prince Street Studio", description: "Weekend gallery sitting, installs, and artist support.", applyUrl: "https://example.org/jobs/prince-gallery-asst", interestSlug: "arts", postedDaysAgo: 3 },
  { title: "Teaching Artist (Ceramics)", company: "Old Stone House", description: "Lead after-school ceramics workshops for middle schoolers.", applyUrl: "https://example.org/jobs/osh-teaching-artist", interestSlug: "arts", postedDaysAgo: 8 },
  { title: "Venue Coordinator", company: "North Brooklyn Consolidated", description: "Coordinate live-music calendars and load-ins across two rooms.", applyUrl: "https://example.org/jobs/nbc-venue-coord", interestSlug: "music", postedDaysAgo: 1 },
  { title: "Community Radio Producer", company: "Queens Airwaves", description: "Produce a weekly neighborhood music program.", applyUrl: "https://example.org/jobs/queens-airwaves-producer", interestSlug: "music", postedDaysAgo: 6 },
  { title: "Farmers Market Manager", company: "Pier 1 Harbor Market", description: "Run the Saturday market operations and vendor relations.", applyUrl: "https://example.org/jobs/pier1-market-mgr", interestSlug: "food", postedDaysAgo: 4 },
  { title: "Pantry Operations Lead", company: "West Side Campaign House", description: "Coordinate community fridge and pantry logistics.", applyUrl: "https://example.org/jobs/wsch-pantry-lead", interestSlug: "food", postedDaysAgo: 9 },
  { title: "Park Stewardship Coordinator", company: "Bronx Outdoors Alliance", description: "Organize volunteer cleanup and planting days.", applyUrl: "https://example.org/jobs/boa-park-steward", interestSlug: "outdoors", postedDaysAgo: 2 },
  { title: "Kayak Program Lifeguard", company: "Harbor Paddles", description: "Seasonal water-safety staff for free public paddles.", applyUrl: "https://example.org/jobs/harbor-lifeguard", interestSlug: "outdoors", postedDaysAgo: 7 },
  { title: "Wellness Studio Front Desk", company: "Hudson Guild Hall Studio", description: "Evenings; check-ins, mat lending, and class prep.", applyUrl: "https://example.org/jobs/hgh-front-desk", interestSlug: "wellness", postedDaysAgo: 3 },
  { title: "Yoga Instructor (Community Classes)", company: "Sunrise Wellness Co-op", description: "Paid instructor for free public park classes.", applyUrl: "https://example.org/jobs/swc-yoga-instructor", interestSlug: "wellness", postedDaysAgo: 10 },
  { title: "Volunteer Coordinator", company: "Queens Newcomers Network", description: "Recruit and schedule volunteers for newcomer welcome events.", applyUrl: "https://example.org/jobs/qnn-volunteer-coord", interestSlug: "community", postedDaysAgo: 1 },
  { title: "Mutual Aid Dispatcher (Part-time)", company: "Bushwick Mutual Aid", description: "Route donation pickups and deliveries.", applyUrl: "https://example.org/jobs/bma-dispatcher", interestSlug: "community", postedDaysAgo: 6 },
  { title: "After-School Program Aide", company: "Park Slope Family Lab", description: "Support hands-on science sessions for ages 5-10.", applyUrl: "https://example.org/jobs/psfl-aide", interestSlug: "family", postedDaysAgo: 4 },
  { title: "Parent Community Manager", company: "Upper East Parents Network", description: "Moderate forums and organize caregiver meetups.", applyUrl: "https://example.org/jobs/uepn-community-mgr", interestSlug: "family", postedDaysAgo: 8 },
  { title: "ESL Program Coordinator", company: "Jackson Heights ESL Circle", description: "Coordinate volunteer teachers and class schedules.", applyUrl: "https://example.org/jobs/jh-esl-coordinator", interestSlug: "learning", postedDaysAgo: 2 },
  { title: "Research Assistant, Civic Guides", company: "City Bureau Press", description: "Fact-check civic explainers against official sources.", applyUrl: "https://example.org/jobs/cbp-research-asst", interestSlug: "learning", postedDaysAgo: 5 },
  { title: "Programmer (Film Series)", company: "SoHo Documentary Club", description: "Curate monthly documentary programs and filmmaker Q&As.", applyUrl: "https://example.org/jobs/shdc-programmer", interestSlug: "film", postedDaysAgo: 3 },
  { title: "Projectionist (Part-time)", company: "Rooftop Reels", description: "Operate outdoor seasonal screenings; AV experience preferred.", applyUrl: "https://example.org/jobs/rooftop-projectionist", interestSlug: "film", postedDaysAgo: 11 },
];
