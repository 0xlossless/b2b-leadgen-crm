import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------- Template-based ad copy generator ----------

interface AdCopyRequest {
  platform: string;
  adType?: string;
  targetAudience?: string;
  keywords?: string[];
  tone?: string;
}

interface AdCopyVariant {
  headline: string;
  description: string;
  cta: string;
}

// Platform-specific templates
const PLATFORM_TEMPLATES: Record<
  string,
  Record<string, AdCopyVariant[]>
> = {
  google_ads: {
    commercial: [
      {
        headline: "Premium Epoxy Flooring for Your Business",
        description:
          "Transform your commercial space with durable, chemical-resistant epoxy floors. Trusted by 500+ businesses. Free estimates — zero downtime installation.",
        cta: "Get Your Free Quote",
      },
      {
        headline: "Industrial-Grade Epoxy Floors | Fast Install",
        description:
          "Upgrade your warehouse, showroom, or office with high-performance epoxy coatings. Slip-resistant, easy to clean, 15-year warranty included.",
        cta: "Schedule a Consultation",
      },
      {
        headline: "Epoxy Flooring That Handles Heavy Traffic",
        description:
          "Built for real businesses. Our epoxy floors withstand forklifts, chemicals & constant foot traffic. Same-week installation available.",
        cta: "Request a Free Estimate",
      },
    ],
    residential: [
      {
        headline: "Stunning Epoxy Garage Floors | Transform Your Space",
        description:
          "Give your garage a showroom finish. Flake, metallic & solid epoxy coatings. Lifetime warranty. Installed in just 1 day.",
        cta: "Get a Free Quote Today",
      },
      {
        headline: "Beautiful, Durable Epoxy Floors for Your Home",
        description:
          "From garages to basements — our epoxy coatings add style and protection. Chip-resistant, easy to maintain. Trusted by 2,000+ homeowners.",
        cta: "See Our Gallery",
      },
      {
        headline: "Garage Floor Makeover in 24 Hours",
        description:
          "Stop hiding your garage. Premium metallic & flake epoxy finishes that last 20+ years. Military-grade durability at affordable prices.",
        cta: "Book Your Free Consultation",
      },
    ],
    general: [
      {
        headline: "Professional Epoxy Flooring Solutions",
        description:
          "Residential & commercial epoxy floor coatings. Durable, beautiful, and built to last. Free estimates for your project.",
        cta: "Get Started Today",
      },
      {
        headline: "#1 Rated Epoxy Floor Installers Near You",
        description:
          "Seamless epoxy coatings for garages, warehouses, restaurants & more. 5-star rated. Licensed & insured. Fast turnaround.",
        cta: "Call for a Free Quote",
      },
      {
        headline: "Epoxy Floors That Last a Lifetime",
        description:
          "Premium floor coatings backed by a 15-year warranty. UV-stable, chemical-resistant, and stunningly beautiful. See why 1,000+ clients trust us.",
        cta: "Request Your Estimate",
      },
    ],
  },
  facebook: {
    commercial: [
      {
        headline: "Your Business Deserves Better Floors",
        description:
          "Cracked, stained concrete? Upgrade to premium epoxy flooring that impresses clients and withstands heavy use. We install over weekends so you don't lose a single business day. 🏗️",
        cta: "Get a Free Estimate",
      },
      {
        headline: "Stop Losing Money on Floor Repairs",
        description:
          "Epoxy flooring pays for itself. Zero maintenance costs, 15-year warranty, and a professional look that wins clients. Join 500+ businesses that made the switch.",
        cta: "Book Your Free Consultation",
      },
      {
        headline: "The Floor Your Business Has Been Waiting For",
        description:
          "From restaurants to auto shops — our epoxy coatings handle anything you throw at them. Literally. Chemical-proof, slip-resistant, and gorgeous. 💪",
        cta: "See Before & After Photos",
      },
    ],
    residential: [
      {
        headline: "Your Garage Deserves a Glow-Up ✨",
        description:
          "Stop stepping over cracks and stains. Our premium epoxy coatings turn any garage into a showroom. Metallic, flake, or solid — pick your style. Installed in 1 day!",
        cta: "See Our Transformations",
      },
      {
        headline: "This Is NOT Your Average Garage Floor",
        description:
          "Metallic epoxy that looks like a million bucks. Resistant to hot tires, chemicals, and everyday wear. Your neighbors will be jealous. 🔥",
        cta: "Get Your Free Quote",
      },
      {
        headline: "Transform Your Garage This Weekend",
        description:
          "Imagine pulling into a garage with a flawless, glossy floor. We make it happen in 24 hours with our premium epoxy coatings. Lifetime warranty included.",
        cta: "Schedule Your Free Estimate",
      },
    ],
    general: [
      {
        headline: "Epoxy Floors That Turn Heads",
        description:
          "Whether it's your garage, basement, or business — our epoxy coatings deliver stunning results that last decades. See why thousands trust us with their floors.",
        cta: "Get a Free Quote",
      },
      {
        headline: "Before & After: You Won't Believe the Difference",
        description:
          "Ugly concrete → Stunning epoxy floor. One day. One crew. One incredible result. Click to see real transformations from real customers. 📸",
        cta: "View Our Gallery",
      },
      {
        headline: "Floors So Good, They Sell Themselves",
        description:
          "5-star reviews, 1,000+ completed projects, and a warranty that beats everyone else. Premium epoxy coatings for homes and businesses.",
        cta: "Request Your Free Estimate",
      },
    ],
  },
  linkedin: {
    commercial: [
      {
        headline: "Elevate Your Facility with Premium Epoxy Flooring",
        description:
          "Forward-thinking businesses invest in infrastructure that lasts. Our commercial epoxy flooring solutions reduce maintenance costs by 60% while creating a professional environment that impresses clients and partners.",
        cta: "Schedule a Facility Assessment",
      },
      {
        headline: "Reduce Facility Maintenance Costs by 60%",
        description:
          "Commercial epoxy flooring isn't just an upgrade — it's a strategic investment. Chemical-resistant, OSHA-compliant, and virtually maintenance-free. Trusted by Fortune 500 facilities.",
        cta: "Download Our ROI Guide",
      },
      {
        headline: "Smart Businesses Invest in Better Floors",
        description:
          "Your facility's flooring impacts safety, productivity, and brand perception. Our industrial-grade epoxy solutions deliver on all three. 15-year warranty, weekend installation.",
        cta: "Request a Consultation",
      },
    ],
    residential: [
      {
        headline: "Premium Home Epoxy Flooring Solutions",
        description:
          "Protect your investment with flooring that lasts decades. Our residential epoxy coatings combine aesthetics with durability — perfect for homeowners who expect the best.",
        cta: "Get Your Free Estimate",
      },
    ],
    general: [
      {
        headline: "The Future of Flooring Is Epoxy",
        description:
          "From warehouses to luxury homes, epoxy flooring delivers unmatched durability and aesthetics. We've completed 1,000+ projects with a 99% satisfaction rate.",
        cta: "Learn More",
      },
      {
        headline: "Why Leading Companies Choose Epoxy Flooring",
        description:
          "Reduced maintenance costs. Enhanced safety. Professional appearance. Discover why epoxy flooring is the #1 choice for commercial and industrial facilities.",
        cta: "See Case Studies",
      },
    ],
  },
  instagram: {
    commercial: [
      {
        headline: "Commercial Floors That Mean Business 💼",
        description:
          "Durable. Beautiful. Built for heavy traffic. Our commercial epoxy floors transform any space into a professional powerhouse. Swipe to see the transformation ➡️",
        cta: "DM Us for a Quote",
      },
    ],
    residential: [
      {
        headline: "Garage Goals 🏠✨",
        description:
          "Metallic epoxy that turns your boring garage into the coolest room in the house. One day install. Lifetime warranty. Tag someone who needs this!",
        cta: "Link in Bio for Free Quote",
      },
      {
        headline: "POV: You Just Got Epoxy Floors 😍",
        description:
          "That fresh, glossy finish hits different. Our flake and metallic epoxy coatings are built to last 20+ years. Ready for your glow-up?",
        cta: "Tap to Get Started",
      },
    ],
    general: [
      {
        headline: "Swipe to See the Transformation 🔥",
        description:
          "Concrete → Stunning epoxy. Every. Single. Time. We bring your floors to life with premium coatings that last a lifetime. Ready for yours?",
        cta: "Link in Bio",
      },
      {
        headline: "Floor Transformations That Break the Internet 🤯",
        description:
          "5 stars. 1,000+ floors. Infinite style options. Metallic, flake, solid — you name it, we pour it. Follow us for daily floor inspo!",
        cta: "DM for a Free Quote",
      },
    ],
  },
};

// Tone-specific adjustments
const TONE_MODIFIERS: Record<string, (v: AdCopyVariant) => AdCopyVariant> = {
  professional: (v) => v, // Already professional by default
  urgent: (v) => ({
    headline: `🚨 ${v.headline} — Limited Slots Available`,
    description: `${v.description} Book this week and save 15% — spots are filling fast!`,
    cta: `${v.cta} — Before It's Too Late`,
  }),
  friendly: (v) => ({
    headline: v.headline.replace(/\|/g, "—"),
    description: `Hey there! ${v.description} We'd love to help you out 😊`,
    cta: `Let's Chat — ${v.cta}`,
  }),
  luxury: (v) => ({
    headline: `✦ ${v.headline.replace("Premium", "Ultra-Premium").replace("Stunning", "Exquisite")}`,
    description: v.description
      .replace("durable", "exceptionally crafted")
      .replace("affordable", "investment-worthy")
      + " An unparalleled experience from consultation to completion.",
    cta: v.cta.replace("Free Quote", "Complimentary Consultation"),
  }),
  value: (v) => ({
    headline: `${v.headline} — Save Up to 20%`,
    description: `${v.description} Best price guaranteed — we'll match any competitor's quote plus give you 10% off.`,
    cta: `${v.cta} + Get Your Discount`,
  }),
};

function getAudienceKey(targetAudience?: string): string {
  if (!targetAudience) return "general";
  const lower = targetAudience.toLowerCase();
  if (
    lower.includes("commercial") ||
    lower.includes("business") ||
    lower.includes("industrial") ||
    lower.includes("warehouse") ||
    lower.includes("restaurant") ||
    lower.includes("retail")
  ) {
    return "commercial";
  }
  if (
    lower.includes("residential") ||
    lower.includes("home") ||
    lower.includes("garage") ||
    lower.includes("basement")
  ) {
    return "residential";
  }
  return "general";
}

function injectKeywords(variant: AdCopyVariant, keywords?: string[]): AdCopyVariant {
  if (!keywords || keywords.length === 0) return variant;
  // Add top keywords naturally into description if not already present
  const keywordStr = keywords.slice(0, 3).join(", ");
  const hasKeywords = keywords.some((k) =>
    variant.description.toLowerCase().includes(k.toLowerCase())
  );
  if (!hasKeywords) {
    return {
      ...variant,
      description: `${variant.description} Specializing in ${keywordStr}.`,
    };
  }
  return variant;
}

// POST /api/marketing/generate - Generate ad copy
export async function POST(request: NextRequest) {
  try {
    const body: AdCopyRequest = await request.json();
    const { platform = "google_ads", adType, targetAudience, keywords, tone } = body;

    // Normalize platform name
    const platformKey = platform
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace("ads", "")
      .replace("_$", "")
      .trim();

    // Find the best matching platform templates
    const platformTemplates =
      PLATFORM_TEMPLATES[platformKey] ||
      PLATFORM_TEMPLATES[platform.toLowerCase()] ||
      PLATFORM_TEMPLATES.google_ads;

    // Get audience-specific templates
    const audienceKey = getAudienceKey(targetAudience);
    const templates =
      platformTemplates[audienceKey] || platformTemplates.general || [];

    if (templates.length === 0) {
      return NextResponse.json(
        { error: "No templates available for this platform/audience combination" },
        { status: 400 }
      );
    }

    // Apply tone modifier if specified
    const toneModifier = tone
      ? TONE_MODIFIERS[tone.toLowerCase()] || TONE_MODIFIERS.professional
      : (v: AdCopyVariant) => v;

    // Generate primary copy and variants
    const processedVariants = templates.map((template) => {
      const withTone = toneModifier(template);
      return injectKeywords(withTone, keywords);
    });

    const primary = processedVariants[0];
    const variants = processedVariants.slice(1);

    // Also generate a bonus variant that combines elements
    if (processedVariants.length >= 2) {
      const bonusVariant: AdCopyVariant = {
        headline: `${processedVariants[1].headline.split("|")[0].split("—")[0].trim()}`,
        description: `${processedVariants[0].description.split(".").slice(0, 2).join(".")}. ${processedVariants[1].description.split(".").slice(-2).join(".")}`,
        cta: processedVariants[processedVariants.length - 1].cta,
      };
      variants.push(injectKeywords(bonusVariant, keywords));
    }

    return NextResponse.json({
      headline: primary.headline,
      description: primary.description,
      cta: primary.cta,
      variants,
      metadata: {
        platform: platformKey,
        audience: audienceKey,
        tone: tone || "professional",
        keywords: keywords || [],
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/marketing/generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate ad copy" },
      { status: 500 }
    );
  }
}
