export const images = {
  check: "/assets/check.svg",
  check2: "/assets/check-02.svg",
  loading1: "/assets/loading-01.svg",
  play: "/assets/play.svg",
  gradient: "/assets/gradient.png",
  smallSphere: "/assets/4-small.png",
  grid: "/assets/grid.png",
  homeSmile: "/assets/home-smile.svg",
  file02: "/assets/file-02.svg",
  searchMd: "/assets/search-md.svg",
  plusSquare: "/assets/plus-square.svg",
  recording03: "/assets/recording-03.svg",
  recording01: "/assets/recording-01.svg",
  disc02: "/assets/disc-02.svg",
  chromecast: "/assets/chrome-cast.svg",
  sliders04: "/assets/sliders-04.svg",
  loading: "/assets/loading.png",
  background: "/assets/background.jpg",
  curve: "/assets/hero/curve.png",
  robot: "/assets/hero/robot.jpg",
  heroBackground: "/assets/hero/hero-background.jpg",
  brandHero: "/assets/hero/usekratose-mountains.png",
  curve1: "/assets/collaboration/curve-1.svg",
  curve2: "/assets/collaboration/curve-2.svg",
  discord: "/assets/collaboration/discord.png",
  figma: "/assets/collaboration/figma.png",
  framer: "/assets/collaboration/framer.png",
  notion: "/assets/collaboration/notion.png",
  photoshop: "/assets/collaboration/photoshop.png",
  protopie: "/assets/collaboration/protopie.png",
  raindrop: "/assets/collaboration/raindrop.png",
  slack: "/assets/collaboration/slack.png",
  service1: "/assets/services/service-1.png",
  service2: "/assets/services/service-2.png",
  service3: "/assets/services/service-3.png",
  lines: "/assets/pricing/lines.svg",
  stars: "/assets/pricing/stars.svg",
  done: "/assets/roadmap/done.svg",
  roadmap1: "/assets/roadmap/image-1.png",
  roadmap2: "/assets/roadmap/image-2.png",
  roadmap3: "/assets/roadmap/image-3.png",
  roadmap4: "/assets/roadmap/image-4.png",
  notification1: "/assets/notification/image-1.png",
  notification2: "/assets/notification/image-2.png",
  notification3: "/assets/notification/image-3.png",
  notification4: "/assets/notification/image-4.png",
  benefitIcon1: "/assets/benefits/icon-1.svg",
  benefitIcon2: "/assets/benefits/icon-2.svg",
  benefitIcon3: "/assets/benefits/icon-3.svg",
  benefitIcon4: "/assets/benefits/icon-4.svg",
  benefitImage2: "/assets/benefits/image-2.png",
} as const;

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

export const navigation = [
  { id: "0", title: "Capabilities", url: "#features", onlyMobile: false },
  { id: "1", title: "How it works", url: "#how-to-use", onlyMobile: false },
  { id: "2", title: "Coverage", url: "#coverage", onlyMobile: false },
  { id: "3", title: "Roadmap", url: "#roadmap", onlyMobile: false },
  { id: "4", title: "New account", url: `${dashboardUrl}/signup`, onlyMobile: true },
  { id: "5", title: "Sign in", url: `${dashboardUrl}/login`, onlyMobile: true },
] as const;

export const heroIcons = [images.homeSmile, images.file02, images.searchMd, images.plusSquare];
export const notificationImages = [images.notification4, images.notification3, images.notification2];
export const brainwaveServicesIcons = [
  images.recording03,
  images.recording01,
  images.disc02,
  images.chromecast,
  images.sliders04,
] as const;
export const evidencePrinciples = [
  "On-chain truth",
  "Finalized evidence",
  "Deterministic rules",
  "Version history",
  "No risk-score theater",
] as const;

export const monitoringChecks = [
  "Executable fingerprint and deployment slot",
  "ProgramData and upgrade authority",
  "IDL, instruction, account, and source changes",
] as const;

export const roadmap = [
  {
    id: "0",
    title: "Continuous program monitoring",
    text: "Resolve loader-v3 ProgramData, fingerprint executable bytes, extract authorities, and combine WebSocket signals with reconciliation polling.",
    date: "SHIPPED",
    status: "done",
    imageUrl: images.roadmap1,
    colorful: true,
  },
  {
    id: "1",
    title: "Deterministic security events",
    text: "Compare consecutive snapshots and persist explainable events for upgrades, ownership, authority, IDL, instruction, and verification changes.",
    date: "SHIPPED",
    status: "done",
    imageUrl: images.roadmap2,
    colorful: false,
  },
  {
    id: "2",
    title: "IDL and source intelligence",
    text: "Normalize available IDLs, identify schema-level deltas, preserve verified repository references, and degrade gracefully when metadata is unavailable.",
    date: "ACTIVE",
    status: "done",
    imageUrl: images.roadmap3,
    colorful: false,
  },
  {
    id: "3",
    title: "Protocol operations",
    text: "Expand delivery workflows, webhook automation, public API ergonomics, and onboarding for real Solana protocol security teams.",
    date: "NEXT",
    status: "progress",
    imageUrl: images.roadmap4,
    colorful: false,
  },
] as const;

export const collabText =
  "UseKratose separates observation, deterministic analysis, storage, delivery, and explanation so every conclusion remains traceable to evidence.";

export const collabContent = [
  { id: "0", title: "WebSocket signals plus reconciliation", text: collabText },
  { id: "1", title: "Immutable snapshot and event ledger", text: null },
  { id: "2", title: "Explicit, explainable severity rules", text: null },
] as const;

export const collabApps = [
  { id: "0", title: "RPC", icon: images.figma, width: 26, height: 36 },
  { id: "1", title: "ProgramData", icon: images.notion, width: 34, height: 36 },
  { id: "2", title: "Snapshots", icon: images.discord, width: 36, height: 28 },
  { id: "3", title: "Events", icon: images.slack, width: 34, height: 35 },
  { id: "4", title: "IDL", icon: images.photoshop, width: 34, height: 34 },
  { id: "5", title: "Source", icon: images.protopie, width: 34, height: 34 },
  { id: "6", title: "Alerts", icon: images.framer, width: 26, height: 34 },
  { id: "7", title: "API", icon: images.raindrop, width: 38, height: 32 },
] as const;

export const pricing = [
  {
    id: "0",
    title: "On-chain evidence",
    description: "The deterministic baseline available for every supported Solana loader-v3 program.",
    level: "01",
    features: [
      "Program and ProgramData resolution",
      "Executable SHA-256 deployment fingerprint",
      "Deployment slot, owner, and upgrade authority",
    ],
  },
  {
    id: "1",
    title: "Program intelligence",
    description: "Deeper interface and provenance context whenever authoritative metadata exists.",
    level: "02",
    features: [
      "Normalized IDL fingerprint and structured diff",
      "Instruction, signer, writable-account, and schema changes",
      "Repository revision and source-verification state",
    ],
  },
  {
    id: "2",
    title: "Security operations",
    description: "Operational delivery for teams that need continuous evidence after every deployment.",
    level: "03",
    features: [
      "Deduplicated security-event ledger",
      "Alert destinations and project-scoped API access",
      "Human-readable evidence with optional AI explanation",
    ],
  },
] as const;

export const benefits = [
  {
    id: "0",
    title: "Deployment fingerprints",
    text: "Hash executable bytes and canonical loader state so every observed deployment has a reproducible identity.",
    backgroundUrl: "/assets/benefits/card-1.svg",
    iconUrl: images.benefitIcon1,
    imageUrl: images.benefitImage2,
    light: false,
  },
  {
    id: "1",
    title: "Upgrade detection",
    text: "Pair WebSocket monitoring with reconciliation polling so disconnects never silently erase an upgrade.",
    backgroundUrl: "/assets/benefits/card-2.svg",
    iconUrl: images.benefitIcon2,
    imageUrl: images.benefitImage2,
    light: true,
  },
  {
    id: "2",
    title: "Authority intelligence",
    text: "Track upgrade authority, immutability, owner, and ProgramData transitions with explicit evidence.",
    backgroundUrl: "/assets/benefits/card-3.svg",
    iconUrl: images.benefitIcon3,
    imageUrl: images.benefitImage2,
    light: false,
  },
  {
    id: "3",
    title: "IDL-level diffs",
    text: "Reveal instruction, signer, writable-account, argument, account-type, and error-definition changes.",
    backgroundUrl: "/assets/benefits/card-4.svg",
    iconUrl: images.benefitIcon4,
    imageUrl: images.benefitImage2,
    light: true,
  },
  {
    id: "4",
    title: "Verification staleness",
    text: "Automatically mark a previously trusted fingerprint stale when the deployed program no longer matches it.",
    backgroundUrl: "/assets/benefits/card-5.svg",
    iconUrl: images.benefitIcon1,
    imageUrl: images.benefitImage2,
    light: false,
  },
  {
    id: "5",
    title: "Explainable events",
    text: "Use fixed security rules and structured evidence instead of opaque numerical scores or AI-generated findings.",
    backgroundUrl: "/assets/benefits/card-6.svg",
    iconUrl: images.benefitIcon2,
    imageUrl: images.benefitImage2,
    light: false,
  },
] as const;
