export interface PortfolioProject {
  slug: string;
  title: string;
  client: string;
  excerpt: string;
  description: string;
  categories: string[];
  disciplines: string[];
  year: number;
  featuredImage: string;
  images: {
    url: string;
    caption?: string;
  }[];
  challenge?: string;
  solution?: string;
  results?: string[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
  liveUrl?: string;
  featured: boolean;
  color: string;
}

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: 'berry-and-rye',
    title: 'Berry & Rye Bar Experience',
    client: 'Berry & Rye',
    excerpt: 'Sophisticated cocktail bar branding and space design that captures the soul of craft mixology.',
    description:
      'Berry & Rye is a craft cocktail bar that needed an identity as refined as their drinks. We developed a complete brand system — from logo and typography to environmental graphics and menu design — that communicates exclusivity without pretension.',
    categories: ['Hospitality', 'Branding'],
    disciplines: ['Brand Identity', 'Environmental Design', 'Photography'],
    year: 2023,
    featuredImage: '/portfolio/berry-and-rye/hero.jpg',
    images: [
      { url: '/portfolio/berry-and-rye/detail-1.jpg', caption: 'Logo application on signage' },
      { url: '/portfolio/berry-and-rye/detail-2.jpg', caption: 'Menu design system' },
    ],
    challenge:
      'Create a brand identity that conveys the speakeasy spirit and craft cocktail culture while remaining approachable to a wider audience.',
    solution:
      'We developed a typographic identity rooted in vintage craft traditions but executed with a modern sensibility, using rich materials and subtle details throughout the physical space.',
    results: [
      'Featured in regional "Best New Bars" lists',
      'Consistent brand recognition across marketing channels',
      'Increased foot traffic by 40% after rebrand',
    ],
    featured: true,
    color: '#8B4513',
  },
  {
    slug: 'brickway-brewery',
    title: 'Brickway Brewery & Distillery',
    client: 'Brickway Brewery and Distillery',
    excerpt: 'Craft beverage brand identity that honors tradition while pushing boundaries.',
    description:
      'Brickway Brewery and Distillery combines the art of craft beer and small-batch spirits under one roof. We shaped a unified brand that celebrates their dual-craft heritage and the historic building they call home.',
    categories: ['Hospitality', 'Branding'],
    disciplines: ['Brand Strategy', 'Packaging Design', 'Space Design'],
    year: 2023,
    featuredImage: '/portfolio/brickway-brewery/hero.jpg',
    images: [
      { url: '/portfolio/brickway-brewery/detail-1.jpg', caption: 'Packaging system' },
      { url: '/portfolio/brickway-brewery/detail-2.jpg', caption: 'Taproom identity' },
    ],
    challenge:
      'Unify two distinct product lines — craft beer and distilled spirits — under a single cohesive brand that reflects the authenticity of the space and the people behind it.',
    solution:
      'A brand system that flexes between the brewery and distillery with shared typography and color language, but distinct sub-brand elements that give each product line its own voice.',
    results: [
      'Unified brand experience across all touchpoints',
      'Award-winning packaging design',
      'Increased retail distribution by 25%',
    ],
    featured: true,
    color: '#2F4F4F',
  },
  {
    slug: 'maha-music-festival',
    title: 'Maha Music Festival',
    client: 'Maha Music Festival',
    excerpt: 'Annual music festival campaign branding that evolves while maintaining a beloved identity.',
    description:
      'Maha Music Festival is the Midwest\'s premier indie music festival. Each year, the brand evolves to reflect the lineup\'s energy while maintaining the recognizable foundation that fans have grown to love.',
    categories: ['Music', 'Event'],
    disciplines: ['Brand Campaign', 'Motion Graphics', 'Merchandise'],
    year: 2024,
    featuredImage: '/portfolio/maha-music-festival/hero.jpg',
    images: [
      { url: '/portfolio/maha-music-festival/detail-1.jpg', caption: 'Festival poster design' },
      { url: '/portfolio/maha-music-festival/detail-2.jpg', caption: 'Merchandise collection' },
    ],
    challenge:
      'Create a fresh annual campaign identity that captures the energy of each year\'s lineup while remaining unmistakably Maha.',
    solution:
      'We developed an adaptable brand toolkit with modular design elements — a consistent logo lock-up paired with annual color palettes, illustration styles, and motion language unique to each year\'s theme.',
    results: [
      'Record-breaking ticket sales year over year',
      'Merchandise sell-through rate of 85%',
      'Strong social media engagement and community buzz',
    ],
    featured: true,
    color: '#FF6B6B',
  },
  {
    slug: 'fontenelle-forest',
    title: 'Fontenelle Forest Conservation',
    client: 'Fontenelle Forest',
    excerpt: 'Nature preserve wayfinding and visitor experience design that connects people with conservation.',
    description:
      'Fontenelle Forest is a beloved nature sanctuary that needed an updated wayfinding system and visitor experience to match the quality of their conservation work and the beauty of the preserve.',
    categories: ['Environmental', 'Nonprofit'],
    disciplines: ['Wayfinding', 'Environmental Graphics', 'Interpretation'],
    year: 2023,
    featuredImage: '/portfolio/fontenelle-forest/hero.jpg',
    images: [
      { url: '/portfolio/fontenelle-forest/detail-1.jpg', caption: 'Trail signage system' },
      { url: '/portfolio/fontenelle-forest/detail-2.jpg', caption: 'Interpretive displays' },
    ],
    challenge:
      'Design a wayfinding and interpretive system that enhances the visitor experience while respecting the natural environment and supporting the organization\'s educational mission.',
    solution:
      'A materials-conscious signage system using sustainable substrates and nature-inspired design language that educates visitors about local ecology at key points throughout the preserve.',
    results: [
      'Improved visitor navigation and satisfaction',
      'Increased membership sign-ups at trailheads',
      'Award recognition from regional design organizations',
    ],
    featured: true,
    color: '#228B22',
  },
  {
    slug: 'house-of-cultivar',
    title: 'House of Cultivar',
    client: 'House of Cultivar',
    excerpt: 'Elevated cannabis retail brand and experience that redefines industry expectations.',
    description:
      'House of Cultivar set out to be the standard-bearer for premium cannabis retail. We crafted a brand identity and retail experience that positions them as a luxury destination — not just a dispensary.',
    categories: ['Retail', 'Branding'],
    disciplines: ['Brand Identity', 'Retail Design', 'Product Design'],
    year: 2024,
    featuredImage: '/portfolio/house-of-cultivar/hero.jpg',
    images: [
      { url: '/portfolio/house-of-cultivar/detail-1.jpg', caption: 'Retail environment design' },
      { url: '/portfolio/house-of-cultivar/detail-2.jpg', caption: 'Product packaging' },
    ],
    challenge:
      'Establish a premium cannabis retail brand that breaks free from industry clichés and appeals to a sophisticated clientele seeking a refined, knowledgeable shopping experience.',
    solution:
      'A brand and retail environment inspired by fine wine cellars and boutique apothecaries — warm materials, editorial product displays, and staff training that creates a consultative customer journey.',
    results: [
      'Highest average transaction value in the market',
      'Featured in cannabis industry design publications',
      'Loyal customer base with high retention rate',
    ],
    featured: true,
    color: '#556B2F',
  },
  {
    slug: 'uc-irvine-stem-cell',
    title: 'UC Irvine Stem Cell Research',
    client: 'UC Irvine Stem Cell Research',
    excerpt: 'Science communication and research visualization that makes complex research accessible.',
    description:
      'The UC Irvine Stem Cell Research Center needed to communicate breakthrough science to diverse audiences — from fellow researchers to potential donors and the general public.',
    categories: ['Research', 'Education'],
    disciplines: ['Data Visualization', 'Editorial Design', 'Science Communication'],
    year: 2023,
    featuredImage: '/portfolio/uc-irvine-stem-cell/hero.jpg',
    images: [
      { url: '/portfolio/uc-irvine-stem-cell/detail-1.jpg', caption: 'Research visualization' },
      { url: '/portfolio/uc-irvine-stem-cell/detail-2.jpg', caption: 'Annual report design' },
    ],
    challenge:
      'Translate complex stem cell research into visually compelling materials that educate, inspire, and drive funding — without oversimplifying the science.',
    solution:
      'A visual language system that uses data-driven illustration, clear information hierarchy, and narrative storytelling to make research milestones tangible and emotionally resonant.',
    results: [
      'Significant increase in public engagement metrics',
      'Supported successful grant applications',
      'Materials adopted as template by other research departments',
    ],
    featured: true,
    color: '#005587',
  },
  {
    slug: 'airbnb',
    title: 'Airbnb Experience Design',
    client: 'Airbnb',
    excerpt: 'Reimagining host onboarding and guest discovery for a more personal travel experience.',
    description:
      'We collaborated with Airbnb on improving the host onboarding flow and guest discovery experience, making both sides of the marketplace feel more personal, intuitive, and connected to the Airbnb mission.',
    categories: ['Product Design', 'UX/UI'],
    disciplines: ['Product Strategy', 'Interface Design', 'Prototyping'],
    year: 2024,
    featuredImage: '/portfolio/airbnb/hero.jpg',
    images: [
      { url: '/portfolio/airbnb/detail-1.jpg', caption: 'Host onboarding flow' },
      { url: '/portfolio/airbnb/detail-2.jpg', caption: 'Discovery interface redesign' },
    ],
    featured: false,
    color: '#FF5A5F',
  },
  {
    slug: 'battle',
    title: 'Battle Creative Campaign',
    client: 'Battle',
    excerpt: 'Bold brand identity for a competitive gaming platform that stands out in a crowded space.',
    description:
      'Battle is a competitive gaming platform that needed a brand as bold and dynamic as its users. We developed a visual identity system built for motion, energy, and the competitive spirit.',
    categories: ['Branding', 'Digital'],
    disciplines: ['Brand Identity', 'Motion Graphics', 'Art Direction'],
    year: 2024,
    featuredImage: '/portfolio/battle/hero.jpg',
    images: [
      { url: '/portfolio/battle/detail-1.jpg', caption: 'Brand identity system' },
      { url: '/portfolio/battle/detail-2.jpg', caption: 'Motion graphics toolkit' },
    ],
    featured: false,
    color: '#E63946',
  },
  {
    slug: 'blue-bunny',
    title: 'Blue Bunny Experiential',
    client: 'Blue Bunny',
    excerpt: '2nd Street experiential marketing activation that brought the brand to life in unexpected ways.',
    description:
      'Blue Bunny wanted to break out of the freezer aisle and into the hearts of a live audience. We designed and produced an experiential activation on 2nd Street that turned ice cream into an unforgettable event.',
    categories: ['Experiential', 'Event'],
    disciplines: ['Event Design', 'Activation Strategy', 'Brand Experiences'],
    year: 2024,
    featuredImage: '/portfolio/blue-bunny/hero.jpg',
    images: [
      { url: '/portfolio/blue-bunny/detail-1.jpg', caption: 'Event design and layout' },
      { url: '/portfolio/blue-bunny/detail-2.jpg', caption: 'Brand activation moments' },
    ],
    featured: false,
    color: '#4169E1',
  },
  {
    slug: 'entrada-cigar',
    title: 'Entrada Cigar Brand',
    client: 'Entrada Cigar',
    excerpt: 'Premium cigar brand and packaging design rooted in heritage and craftsmanship.',
    description:
      'Entrada Cigar is a premium cigar brand that honors the tradition and craft of cigar-making. We developed a brand identity and packaging system that conveys heritage, quality, and the ritual of enjoyment.',
    categories: ['Branding', 'Packaging'],
    disciplines: ['Brand Identity', 'Package Design', 'Copywriting'],
    year: 2024,
    featuredImage: '/portfolio/entrada-cigar/hero.jpg',
    images: [
      { url: '/portfolio/entrada-cigar/detail-1.jpg', caption: 'Packaging system' },
      { url: '/portfolio/entrada-cigar/detail-2.jpg', caption: 'Brand collateral' },
    ],
    featured: false,
    color: '#654321',
  },
  {
    slug: 'metro-orbt',
    title: 'Metro ORBT Bus System',
    client: 'Metro ORBT Bus',
    excerpt: 'Public transit branding and passenger experience that modernizes urban transportation.',
    description:
      'Metro ORBT is a bus rapid transit system that needed a complete brand identity and passenger experience design — from vehicle livery and station design to digital wayfinding and rider communication.',
    categories: ['Public', 'Transportation'],
    disciplines: ['Brand Identity', 'Environmental Design', 'Signage'],
    year: 2023,
    featuredImage: '/portfolio/metro-orbt/hero.jpg',
    images: [
      { url: '/portfolio/metro-orbt/detail-1.jpg', caption: 'Station design' },
      { url: '/portfolio/metro-orbt/detail-2.jpg', caption: 'Vehicle livery' },
    ],
    featured: false,
    color: '#1E90FF',
  },
  {
    slug: 'the-new-blk',
    title: 'The New BLK Agency Evolution',
    client: 'Internal',
    excerpt: 'The rebranding journey from traditional agency to creative collective.',
    description:
      'The New BLK was the original incarnation of what would become Ask+Deliver. This project documents the strategic evolution from a traditional agency model to a flexible creative collective — and the brand transformation that came with it.',
    categories: ['Branding', 'Strategy'],
    disciplines: ['Brand Strategy', 'Visual Identity', 'Positioning'],
    year: 2024,
    featuredImage: '/portfolio/the-new-blk/hero.jpg',
    images: [
      { url: '/portfolio/the-new-blk/detail-1.jpg', caption: 'Brand evolution timeline' },
      { url: '/portfolio/the-new-blk/detail-2.jpg', caption: 'New visual identity' },
    ],
    featured: false,
    color: '#000000',
  },
];
