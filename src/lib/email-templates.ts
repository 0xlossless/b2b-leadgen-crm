// Industry-specific cold email templates for Golden State Epoxy Flooring

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface IndustryTemplates {
  initial: EmailTemplate;
  followup: EmailTemplate;
}

function fill(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}

const TEMPLATES: Record<string, IndustryTemplates> = {
  auto_repair: {
    initial: {
      subject: "Upgrade {{company_name}}'s Shop Floor — Built for the Grind",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring, and I work with auto shops across the Tri-Valley and East Bay.

I wanted to reach out because I know how brutal shop floors take it — oil drips, brake fluid, dropped tools, jacks rolling around all day. Most concrete floors crack, stain, and become a headache to keep clean.

We install commercial-grade epoxy and polyaspartic coatings specifically designed for auto repair environments:

• Chemical & oil resistant — brake fluid, transmission fluid, and solvents wipe right up
• Impact-tough — handles dropped tools and rolling jacks without chipping
• Anti-slip texture — keeps your crew safe even on wet surfaces
• Easy to clean — hose it down at the end of the day and you're done

We recently coated a shop in {{city}} and the owner said it cut his cleanup time in half. Plus, customers notice when a shop looks professional — it builds trust.

Would you be open to a quick 10-minute call or a free on-site estimate? No pressure at all.

Best,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: {{company_name}}'s Shop Floor",
      body: `Hi {{contact_name}},

Just circling back on my note about epoxy flooring for {{company_name}}. I know you're busy turning wrenches, so I'll keep it short.

If your shop floor is cracking, staining, or hard to clean — we can fix that in 1-2 days with zero downtime on a weekend install.

Happy to swing by for a free estimate — no pressure at all.

Worth a quick chat?

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },

  restaurant: {
    initial: {
      subject: "{{company_name}} — Floors That Handle the Kitchen Heat",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We specialize in commercial flooring for restaurants and food service businesses in the {{city}} area.

Restaurant floors take a beating — constant foot traffic, spills, grease, hot water, and they still need to look great when guests walk in. I've seen too many restaurants dealing with cracked tile, peeling coatings, or floors that are impossible to keep sanitary.

Here's what we offer:

• Antimicrobial epoxy coatings — meets health code standards, easy to pass inspections
• Slip-resistant finishes — critical for kitchen and bar areas where spills are constant
• Seamless surface — no grout lines means no trapped bacteria or grease
• Decorative metallic options — stunning finishes for dining areas and entryways
• Fast cure times — we can do weekend installs so you don't lose business days

A clean, professional floor transforms the dining experience. Your guests notice, and your staff will thank you.

Would you be interested in a free walkthrough and estimate? I can work around your schedule.

Best,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Flooring for {{company_name}}",
      body: `Hi {{contact_name}},

Following up on my note about upgrading {{company_name}}'s floors. Quick question — are you dealing with any cracking, staining, or slip issues in the kitchen or dining area?

We do free estimates and can install over a weekend so you don't miss a single service. Health inspectors love our seamless, antimicrobial coatings too.

Happy to stop by whenever works for you.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },

  gym_fitness: {
    initial: {
      subject: "{{company_name}} — Floors Built for Heavy Lifting",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring, and I work with gyms and fitness studios across the {{city}} area.

I know gym floors take serious abuse — dropped weights, heavy equipment, constant foot traffic, and sweat. Standard flooring just doesn't hold up, and replacing rubber mats every year gets expensive.

We install commercial epoxy and polyaspartic floor systems built specifically for fitness environments:

• Impact & drop resistant — handles dumbbells, kettlebells, and plate drops
• Rubber-epoxy hybrid zones — we can create dedicated lifting areas with extra cushion
• Antimicrobial surface — easy to sanitize, no cracks for bacteria to hide in
• Custom colors and logos — brand your space right into the floor
• Low maintenance — just mop and go, no waxing or resealing

A clean, modern floor makes your gym look premium and keeps members coming back. We'd love to show you what's possible for {{company_name}}.

Worth a quick chat about what an upgrade could look like for {{company_name}}?

Best,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Flooring upgrade for {{company_name}}",
      body: `Hi {{contact_name}},

Quick follow-up — have you thought about upgrading {{company_name}}'s floors? We can do custom zones (lifting area, cardio, stretching) with different textures and colors, all in one seamless install.

Weekend installs available so your members don't miss a workout. Free estimate anytime.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },

  brewery_winery: {
    initial: {
      subject: "{{company_name}} — Floors That Handle the Spills (and Look Amazing)",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We work with breweries and wineries across Livermore Valley and the Tri-Valley.

I know your production floors deal with constant moisture, acidic spills, cleaning chemicals, and heavy equipment. And your tasting room? That needs to look as good as your product tastes.

We install specialized coatings for both sides of your operation:

Production / Cellar:
• Chemical & acid resistant — handles wine, beer, sanitizers, and caustic cleaners
• Sloped-to-drain compatible — proper drainage for washdown areas
• FDA/USDA compliant coatings — food-safe and inspection-ready
• Non-slip even when wet — critical for production safety

Tasting Room / Taproom:
• Metallic and decorative epoxy — stunning, one-of-a-kind finishes
• Stain-proof — red wine, dark beer, nothing penetrates
• Easy to maintain — your staff spends less time cleaning, more time pouring

I'd love to show you what we can do for {{company_name}}.

Free estimate — I can come by anytime that works for you.

Cheers,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Flooring for {{company_name}}",
      body: `Hi {{contact_name}},

Following up on my note about flooring for {{company_name}}. Whether it's the production floor or tasting room (or both), we've got coatings built for exactly what you deal with daily.

Happy to swing by, buy a pint/glass, and give you a free quote while I'm there. 🍺🍷

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },

  property_management: {
    initial: {
      subject: "{{company_name}} — Upgrade Your Properties with Zero Maintenance Floors",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We work with property management companies in {{city}} and across the East Bay to upgrade high-traffic common areas.

If you manage residential or commercial properties, you know the flooring headaches — parking garages that crack and dust, laundry rooms with moisture damage, lobbies that look worn after a year, and maintenance costs that add up.

Here's how we help property managers:

• Parking garages — dust-proof, chemical-resistant coatings with line striping included
• Common areas & lobbies — decorative epoxy that looks premium and is built to last
• Laundry rooms — moisture-resistant, seamless floors that won't warp or mold
• Storage units — dust-proof concrete coatings that tenants love
• Stairwells — anti-slip coatings for safety compliance

Our coatings reduce your maintenance costs and boost property value. Tenants notice the difference, and it makes your properties stand out during tours.

Would you be open to discussing a property or two where this might make sense?

Best,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Flooring for {{company_name}} properties",
      body: `Hi {{contact_name}},

Just following up — do you have any properties with parking garages, common areas, or units that could use a flooring refresh?

We offer volume discounts for property management companies and can schedule installs around tenant schedules. Free estimates on any property in the {{city}} area.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },

  manufacturing: {
    initial: {
      subject: "{{company_name}} — Industrial Floors Built for Production",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We install industrial-grade floor coatings for manufacturing facilities in {{city}} and the greater Bay Area.

Manufacturing floors face the toughest conditions — heavy machinery, chemical exposure, forklift traffic, and constant worker foot traffic. Cracked or dusting concrete is more than ugly — it's a safety hazard and an OSHA liability.

Here's what we bring to the table:

• Heavy-duty epoxy systems — rated for forklift and machinery loads
• Chemical-resistant coatings — handles oils, solvents, and industrial cleaners
• Safety markings — OSHA-compliant line striping for walkways, hazard zones, and equipment areas
• Anti-static options — ESD flooring for electronics and sensitive manufacturing
• Dust-proofing — sealed concrete means cleaner products and better air quality
• Fast turnaround — phased installs available so production doesn't stop

A properly coated production floor improves safety, reduces maintenance, and looks professional for client tours and inspections.

Would a free on-site assessment be useful for {{company_name}}?

Best,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Industrial flooring for {{company_name}}",
      body: `Hi {{contact_name}},

Following up on industrial flooring for {{company_name}}. If your production floor has any cracking, dusting, chemical staining, or safety marking needs — we can handle it all in one project.

We do phased installs (nights/weekends) so your production line keeps running. Free assessment anytime.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },

  warehouse: {
    initial: {
      subject: "{{company_name}} — Warehouse Floors That Perform",
      body: `Hi {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We coat warehouse and distribution floors across the {{city}} area.

Warehouse concrete takes a beating — forklifts, pallet jacks, heavy loads, and constant traffic grind down bare concrete fast. Dust, cracks, and unclear markings create safety issues and slow down operations.

We install coatings specifically designed for warehouse environments:

• Forklift-rated epoxy — handles heavy wheel loads without chipping or peeling
• Dust-proof finish — no more concrete dust on products, equipment, or in the air
• Line striping — traffic lanes, loading zones, pedestrian walkways, rack locations
• Loading dock coatings — impact-resistant for the highest-traffic areas
• Reflective finishes — brighten your space by up to 30% with light-reflective coatings
• Fast cure — polyaspartic systems ready for traffic in 24 hours

Clean, marked, dust-free floors make your operation run smoother and keep workers safer. Plus it looks professional for any client or inspector walkthroughs.

Interested in a free walkthrough and estimate?

Best,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Warehouse flooring for {{company_name}}",
      body: `Hi {{contact_name}},

Quick follow-up on warehouse flooring for {{company_name}}. If your concrete is dusting, cracking, or needs fresh line striping, we can knock it out in a weekend.

Happy to stop by for a free estimate — no obligation.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
  },
};

// Map database industry values to template keys
const INDUSTRY_MAP: Record<string, string> = {
  // Database values
  "Automotive": "auto_repair",
  "Commercial": "warehouse", // catch-all for commercial/industrial
  "Fitness": "gym_fitness",
  "Restaurant": "restaurant",
  "Real Estate": "property_management",
  "Storage": "warehouse",
  "Winery": "brewery_winery",
  "Brewery": "brewery_winery",
  // Alternate names
  "Auto Body & Repair": "auto_repair",
  "Auto Repair & Service": "auto_repair",
  "Restaurants & Dining": "restaurant",
  "Gym & Fitness": "gym_fitness",
  "Brewery & Winery": "brewery_winery",
  "Property Management": "property_management",
  "Manufacturing": "manufacturing",
  "Warehouse": "warehouse",
  "Warehouse & Distribution": "warehouse",
};

export function getTemplate(
  industry: string,
  variant: "initial" | "followup" = "initial"
): EmailTemplate | null {
  const key = INDUSTRY_MAP[industry] || industry.toLowerCase().replace(/[^a-z_]/g, "_");
  const templates = TEMPLATES[key];
  if (!templates) return null;
  return templates[variant];
}

export function renderEmail(
  industry: string,
  variant: "initial" | "followup",
  vars: { company_name: string; contact_name: string; city: string }
): EmailTemplate | null {
  const template = getTemplate(industry, variant);
  if (!template) return null;
  return {
    subject: fill(template.subject, vars),
    body: fill(template.body, vars),
  };
}

export function getAvailableIndustries(): string[] {
  return Object.keys(TEMPLATES);
}

export { TEMPLATES, INDUSTRY_MAP };
