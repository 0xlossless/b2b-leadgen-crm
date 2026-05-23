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
      subject: "Quick question about {{company_name}}'s floors",
      body: `Hey {{contact_name}},

I'm Joseph — I run Golden State Epoxy out here in the Tri-Valley. I coat floors for auto shops, and I was looking at businesses in {{city}} when I came across {{company_name}}.

I'll keep it real — shop floors take a beating. Oil, brake fluid, jacks, dropped tools... most concrete just can't keep up. The shops I work with usually tell me the same thing: cleanup used to be a nightmare, and now they just hose it off at the end of the day.

If your floor's in rough shape or you've been thinking about upgrading it, I'd be happy to swing by and take a look. No cost, no pitch — just an honest assessment of what it would take.

Either way, hope business is good.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: {{company_name}}'s floors",
      body: `Hey {{contact_name}},

Just bumping this up — I know you're busy. If your shop floor ever becomes a priority, I'm around. We can usually knock it out over a weekend so you don't lose any business days.

Happy to come take a look whenever it makes sense.

Joseph
(925) 518-2985`,
    },
  },

  restaurant: {
    initial: {
      subject: "Thought about {{company_name}}'s floors",
      body: `Hey {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring, based out here in the Tri-Valley. I work with restaurants in the {{city}} area and figured I'd reach out.

I know floors probably aren't top of mind when you're running a restaurant — until they become a problem. Cracked tile trapping grease, coatings peeling in the kitchen, guests noticing wear in the dining room. It adds up.

What we do is pretty straightforward — we put down a seamless epoxy coating that's slip-resistant, easy to clean, and looks great in the front of house. Kitchen side, it's built to handle the grease, the heat, and the health inspector.

If you're ever thinking about redoing the floors, I'd love to walk through your space and give you an honest idea of what it would cost. No strings attached.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: {{company_name}}'s floors",
      body: `Hey {{contact_name}},

Just following up — are floors on your radar at all right now? No worries if the timing's off. We do weekend installs so you wouldn't have to close, and I'm happy to give you a free walkthrough whenever.

Joseph
(925) 518-2985`,
    },
  },

  gym_fitness: {
    initial: {
      subject: "Floor question for {{company_name}}",
      body: `Hey {{contact_name}},

I'm Joseph — I own Golden State Epoxy Flooring out here in the Tri-Valley. I've been working with gym and fitness spaces in {{city}} and wanted to see if this might be relevant for you.

Gym floors deal with a lot — dropped weights, heavy equipment, sweat, constant traffic. Most standard flooring just breaks down. What we do is put down a commercial epoxy system that can handle the abuse, looks clean, and is way easier to maintain than what you're probably dealing with now.

We can also do custom zones — different colors or textures for lifting areas vs. cardio vs. stretching — all in one seamless surface.

If you've been thinking about the floors at all, I'd be happy to come check out your space and give you a straight answer on what it would take. No cost for that.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Floors at {{company_name}}",
      body: `Hey {{contact_name}},

Circling back on this — if flooring ever becomes a priority for {{company_name}}, I'm around. We do weekend installs so your members wouldn't miss a beat.

Happy to stop by anytime.

Joseph
(925) 518-2985`,
    },
  },

  brewery_winery: {
    initial: {
      subject: "Floors at {{company_name}} — quick thought",
      body: `Hey {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring — based right here in Livermore Valley. Figured I'd reach out since I work with breweries and wineries in the area.

Your production side and your tasting room have completely different floor needs, and we handle both. On the production side, we use coatings that can take the acid, the moisture, and the constant washdowns. For the tasting room, we do metallic epoxy finishes that honestly look incredible — each one comes out unique.

If your floors have been bugging you or you're planning a refresh, I'd love to come by, check out the space, and give you a real number. No obligation — and I'll gladly grab a pint or a glass while I'm there.

Cheers,
Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Floors at {{company_name}}",
      body: `Hey {{contact_name}},

Just following up — any interest in looking at the floors? Happy to swing by and keep it casual. Free estimate, no commitment.

Joseph
(925) 518-2985`,
    },
  },

  property_management: {
    initial: {
      subject: "Flooring idea for {{company_name}} properties",
      body: `Hey {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. I work with property managers in {{city}} and wanted to float something by you.

If you manage properties with parking garages, common areas, or laundry rooms — you already know how fast concrete breaks down in those high-traffic spots. Cracking, dusting, staining... it's a constant maintenance drain and it makes the property look tired.

What we do is put down an epoxy coating that solves most of those problems in one shot. Parking garages stay dust-free and we include line striping. Lobbies and common areas get a clean, premium look. Laundry rooms stop warping and molding.

If you've got a property or two in mind where this might make sense, I'd be happy to take a look and give you a number. We also do volume pricing for management companies with multiple properties.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Flooring for {{company_name}} properties",
      body: `Hey {{contact_name}},

Just checking in — do you have any properties that could use a flooring refresh? We work around tenant schedules and can usually handle a space over a weekend.

Free estimates on anything in the {{city}} area. Just let me know.

Joseph
(925) 518-2985`,
    },
  },

  manufacturing: {
    initial: {
      subject: "Quick question about {{company_name}}'s production floor",
      body: `Hey {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We do industrial floor coatings for manufacturing facilities in the {{city}} area, and I wanted to see if this is on your radar.

Production floors deal with a lot — forklifts, chemicals, heavy foot traffic. When concrete starts cracking and dusting, it's not just ugly — it's a safety issue and it can mess with air quality and product cleanliness.

We put down heavy-duty epoxy systems that handle all of it. We can also do OSHA-compliant safety markings — walkways, hazard zones, equipment areas — all built into the floor. And we do phased installs (nights or weekends) so your production line keeps running.

If your floor could use some attention, I'd be happy to come take a look and give you a straight answer on what it would take. No cost for the assessment.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: {{company_name}}'s production floor",
      body: `Hey {{contact_name}},

Following up — if your production floor has any cracking, dusting, or needs fresh safety markings, I'd be happy to come take a look. We can handle it all in one project without shutting down your line.

Let me know if it makes sense to connect.

Joseph
(925) 518-2985`,
    },
  },

  warehouse: {
    initial: {
      subject: "{{company_name}}'s warehouse floor — quick thought",
      body: `Hey {{contact_name}},

I'm Joseph with Golden State Epoxy Flooring. We coat warehouse floors in the {{city}} area and I wanted to reach out.

Bare concrete in a warehouse breaks down fast — forklifts, pallet jacks, and heavy loads grind it up. You end up with dust everywhere, cracks that catch wheels, and faded markings that nobody can follow. It slows things down and creates liability.

What we do is seal and coat the floor so it's dust-free, impact-resistant, and clearly marked. Traffic lanes, loading zones, pedestrian paths — all built in. The floor also reflects more light, which brightens the whole space without adding fixtures.

If your concrete's seen better days, I'd be glad to walk through and give you an honest estimate. No cost, no pressure.

Joseph Galindo
Golden State Epoxy Flooring
(925) 518-2985`,
    },
    followup: {
      subject: "Re: Warehouse flooring for {{company_name}}",
      body: `Hey {{contact_name}},

Circling back — if your warehouse floor is dusting, cracking, or the markings have faded, we can usually knock it out over a weekend.

Happy to stop by and take a look whenever works for you.

Joseph
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
  "Hospitality": "brewery_winery",
  "Healthcare": "manufacturing", // similar needs — durable, easy to clean
  "Retail": "property_management", // similar needs — high traffic, aesthetics
  "Construction": "warehouse", // similar needs — heavy duty
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
