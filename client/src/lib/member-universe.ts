// The member "universe" — the interactive club sections that orbit the globe
// for logged-in returning members. Data-only here; rendered by MemberUniverseHero.

export interface UniverseItem {
  label: string;
  /** optional live highlight / news line shown in the expanded card */
  news?: string;
}

export interface UniverseSection {
  id: string;
  /** lucide-react icon name rendered for this section */
  icon: string;
  title: string;
  subtitle?: string;
  /** the orbit ring index — 0 = closest to globe */
  ring: number;
  /** angular position on its ring (radians) */
  angle: number;
  accent: string; // hex color used for the node glow + card accent
  items: UniverseItem[];
}

// 11 sections across 3 orbital rings around the globe.
// Ring 0 (inner): core communities. Ring 1 (mid): knowledge & tools. Ring 2 (outer): growth & reward.
export const UNIVERSE_SECTIONS: UniverseSection[] = [
  {
    id: "motherhood",
    icon: "Heart",
    title: "Motherhood Community",
    subtitle: "The heart of the order",
    ring: 0,
    angle: -Math.PI / 2,
    accent: "#f5d27a",
    items: [
      { label: "New Members" },
      { label: "Success Stories" },
      { label: "Community Announcements" },
    ],
  },
  {
    id: "business",
    icon: "Briefcase",
    title: "Business Club",
    subtitle: "For Entrepreneurs, Founders & Investors",
    ring: 0,
    angle: Math.PI / 6,
    accent: "#e0a64b",
    items: [
      { label: "Founder Lane" },
      { label: "Investor Lane" },
      { label: "Startup Showcase" },
      { label: "Project Presentations" },
      { label: "Investment Opportunities" },
      { label: "Funding News", news: "Project Aurora secured 50k funding" },
      { label: "Business Strategies" },
      { label: "Networking" },
    ],
  },
  {
    id: "cooperation",
    icon: "Handshake",
    title: "Cooperation Club",
    subtitle: "Build together, win together",
    ring: 0,
    angle: Math.PI - Math.PI / 6,
    accent: "#d9c08a",
    items: [
      { label: "Find Business Partners" },
      { label: "Joint Ventures" },
      { label: "Service Exchange" },
      { label: "Collaboration Requests" },
      { label: "Mastermind Groups" },
    ],
  },
  {
    id: "wealth",
    icon: "Landmark",
    title: "Wealth Club",
    subtitle: "Capital, sovereign",
    ring: 1,
    angle: -Math.PI / 2 + 0.4,
    accent: "#f0c75e",
    items: [
      { label: "Stocks & ETFs" },
      { label: "Crypto" },
      { label: "Real Estate" },
      { label: "Precious Metals" },
      { label: "Macroeconomics" },
      { label: "Wealth Building" },
    ],
  },
  {
    id: "education",
    icon: "BookOpen",
    title: "Education Hub",
    subtitle: "Mastery, taught by masters",
    ring: 1,
    angle: Math.PI / 6 + 0.3,
    accent: "#caa45a",
    items: [
      { label: "Business" },
      { label: "Sales" },
      { label: "Marketing" },
      { label: "AI" },
      { label: "Leadership" },
      { label: "Personal Development" },
    ],
  },
  {
    id: "tools",
    icon: "Wrench",
    title: "Tools Hub",
    subtitle: "The stack of the sovereign",
    ring: 1,
    angle: Math.PI - Math.PI / 6 - 0.3,
    accent: "#bda06a",
    items: [
      { label: "AI Tools" },
      { label: "Productivity Apps" },
      { label: "Business Software" },
      { label: "Communication Apps" },
    ],
  },
  {
    id: "freedom",
    icon: "Compass",
    title: "Freedom & Independence",
    subtitle: "Off-grid, self-reliant",
    ring: 2,
    angle: -Math.PI / 2 - 0.5,
    accent: "#9fb86a",
    items: [
      { label: "Off-Grid Communication" },
      { label: "Privacy & Digital Security" },
      { label: "Survival Skills" },
      { label: "Self-Reliance" },
      { label: "Alternative Technologies" },
    ],
  },
  {
    id: "courses",
    icon: "GraduationCap",
    title: "Courses",
    subtitle: "Learn the path",
    ring: 2,
    angle: 0.5,
    accent: "#d8b56a",
    items: [
      { label: "Exclusive Courses" },
      { label: "Workshops" },
      { label: "Masterclasses" },
      { label: "Learning Paths" },
      { label: "Certificates" },
    ],
  },
  {
    id: "health",
    icon: "HeartPulse",
    title: "Health Club",
    subtitle: "Body, mind, longevity",
    ring: 2,
    angle: Math.PI - 0.5,
    accent: "#a8c47a",
    items: [
      { label: "Fitness" },
      { label: "Nutrition" },
      { label: "Recovery" },
      { label: "Mental Strength" },
      { label: "Longevity" },
    ],
  },
  {
    id: "merits",
    icon: "Award",
    title: "Merits",
    subtitle: "Contribution, recognized",
    ring: 2,
    angle: Math.PI / 2,
    accent: "#f5d27a",
    items: [
      { label: "Earn Merits for Contributions" },
      { label: "Community Recognition" },
      { label: "Achievement Levels" },
      { label: "Rewards" },
      { label: "Special Member Status" },
    ],
  },
  {
    id: "mentors",
    icon: "Users",
    title: "Mentors & Coaches",
    subtitle: "Live contact for Q&A",
    ring: 0,
    angle: Math.PI / 2,
    accent: "#e0a64b",
    items: [
      { label: "Business Coaches" },
      { label: "Investment Experts" },
      { label: "Mindset Coaches" },
      { label: "Live Q&A — contact now" },
    ],
  },
];

// Ring radii in viewport-relative units (fraction of min(vw,vh)).
export const RING_RADII = [0.30, 0.40, 0.49];
