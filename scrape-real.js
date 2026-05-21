// Real Google Maps scraper via SerpAPI → Supabase
const https = require('https');

const SERP_KEY = 'b4c93205a7647fc4c0b937723b2cc3050d7fa7c7ad23c577eae99b8f7c79f25f';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW9pbW93cWludGp1bXhldHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMzMDc3NywiZXhwIjoyMDk0OTA2Nzc3fQ.Yh0VmFE3F8DF26MJZzQ7Ug0NqSkuc9xqaaicYh3pCjM';
const SUPABASE_URL = 'https://raeoimowqintjumxetsx.supabase.co';

// ─── Helpers ────────────────────────────────────────────
function ulid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = Array.from({length:16}, () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random()*32)]).join('');
  return t + r;
}

function now() { return new Date().toISOString(); }

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function supabasePost(table, data) {
  const body = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const url = new (require('url').URL)(`${SUPABASE_URL}/rest/v1/${table}`);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${table}: ${res.statusCode} ${d}`));
        else resolve({ status: res.statusCode });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function supabaseGet(table, query = '') {
  return new Promise((resolve, reject) => {
    const url = new (require('url').URL)(`${SUPABASE_URL}/rest/v1/${table}?${query}`);
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── ICP Scoring ────────────────────────────────────────
const TARGET_INDUSTRIES = ['Construction','Real Estate','Property Management','Manufacturing','Warehouse','Restaurant','Automotive','Healthcare','Retail','Hospitality','Fitness','Food & Beverage','Logistics','Industrial','Brewery','Winery','Auto Body','Auto Repair','Gym','CrossFit','Dental','Veterinary','Car Wash','Storage','Flooring'];

function scoreLead(data) {
  let industryMatch = 0;
  if (data.industry) {
    const ind = data.industry.toLowerCase();
    if (TARGET_INDUSTRIES.some(t => ind.includes(t.toLowerCase()) || t.toLowerCase().includes(ind))) industryMatch = 20;
  }
  const employeeFit = (data.employeeCount && data.employeeCount >= 1 && data.employeeCount <= 200) ? 15 : 0;
  const decisionMaker = data.hasDecisionMaker ? 20 : 0;
  let techMatch = 0;
  const techs = data.techStack || [];
  const targetTech = ['Angi','HomeAdvisor','Yelp','Google Business','Houzz','BuildZoom','Thumbtack'];
  techMatch = Math.min(techs.filter(t => targetTech.some(tt => tt.toLowerCase() === t.toLowerCase())).length * 5, 15);
  const emailVerified = data.emailVerified ? 5 : 0;
  const totalScore = industryMatch + employeeFit + decisionMaker + techMatch + emailVerified;
  const tier = totalScore >= 80 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';
  return { totalScore, tier, industryMatch, employeeFit, decisionMaker, techMatch, fundingEvent: 0, trafficScore: 0, emailVerified, disqualified: totalScore < 30, disqualifyReason: totalScore < 30 ? 'low_overall_score' : null };
}

// ─── Extract industry from Google Maps categories ───────
function extractIndustry(types, title) {
  const typeMap = {
    'car_repair': 'Automotive', 'car_dealer': 'Automotive', 'car_wash': 'Car Wash',
    'restaurant': 'Restaurant', 'food': 'Food & Beverage', 'cafe': 'Food & Beverage',
    'gym': 'Fitness', 'health': 'Healthcare', 'hospital': 'Healthcare',
    'dentist': 'Dental', 'veterinary_care': 'Veterinary', 'real_estate_agency': 'Real Estate',
    'storage': 'Storage', 'store': 'Retail', 'shopping_mall': 'Retail',
    'lodging': 'Hospitality', 'hair_care': 'Retail', 'beauty_salon': 'Retail',
    'general_contractor': 'Construction', 'plumber': 'Construction', 'electrician': 'Construction',
    'roofing_contractor': 'Construction', 'flooring_store': 'Flooring',
    'brewery': 'Brewery', 'bar': 'Food & Beverage',
  };
  
  if (types) {
    for (const t of types) {
      if (typeMap[t]) return typeMap[t];
    }
  }
  
  const titleLower = (title || '').toLowerCase();
  if (titleLower.includes('auto') || titleLower.includes('car')) return 'Automotive';
  if (titleLower.includes('restaurant') || titleLower.includes('grill') || titleLower.includes('kitchen')) return 'Restaurant';
  if (titleLower.includes('gym') || titleLower.includes('crossfit') || titleLower.includes('fitness')) return 'Fitness';
  if (titleLower.includes('dental') || titleLower.includes('dentist')) return 'Dental';
  if (titleLower.includes('warehouse') || titleLower.includes('storage')) return 'Storage';
  if (titleLower.includes('brew')) return 'Brewery';
  if (titleLower.includes('winery') || titleLower.includes('cellar')) return 'Winery';
  if (titleLower.includes('property') || titleLower.includes('realty') || titleLower.includes('real estate')) return 'Real Estate';
  return 'Commercial';
}

// ─── Main Scraper ───────────────────────────────────────
async function scrapeGoogleMaps(query, location) {
  console.log(`\n🔍 Searching: "${query}" in ${location}`);
  
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&ll=@37.6818,-121.7681,12z&type=search&api_key=${SERP_KEY}`;
  
  const results = await httpGet(url);
  
  if (!results.local_results) {
    console.log('   ⚠ No results found');
    return [];
  }
  
  console.log(`   📍 Found ${results.local_results.length} businesses`);
  return results.local_results;
}

async function main() {
  console.log('🚀 Golden State Epoxy — Lead Scraper');
  console.log('====================================\n');
  
  // First, clear demo data
  console.log('🗑️  Clearing demo data...');
  // Delete in reverse dependency order
  const tables = ['activities', 'lead_scores', 'contacts', 'deals', 'leads', 'scrape_jobs'];
  for (const table of tables) {
    const existing = await supabaseGet(table, 'select=id');
    if (existing.length > 0) {
      for (const row of existing) {
        await new Promise((resolve, reject) => {
          const url = new (require('url').URL)(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${row.id}`);
          const req = https.request({
            hostname: url.hostname, port: 443, path: url.pathname + url.search,
            method: 'DELETE',
            headers: { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY }
          }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end', () => resolve()); });
          req.on('error', reject); req.end();
        });
      }
      console.log(`   ✅ Cleared ${existing.length} rows from ${table}`);
    }
  }
  
  // Create scrape job
  const jobId = ulid();
  const ts = now();
  
  // Search queries targeting epoxy-ready businesses
  const searches = [
    { query: 'auto body shop', location: 'Livermore CA' },
    { query: 'warehouse commercial', location: 'Livermore CA' },
    { query: 'restaurant', location: 'Livermore CA' },
    { query: 'gym fitness', location: 'Livermore CA' },
    { query: 'brewery winery', location: 'Livermore CA' },
    { query: 'auto repair', location: 'Pleasanton CA' },
    { query: 'commercial property management', location: 'Dublin CA' },
    { query: 'manufacturing', location: 'Fremont CA' },
  ];
  
  let allResults = [];
  let searchesUsed = 0;
  
  for (const search of searches) {
    const results = await scrapeGoogleMaps(search.query, search.location);
    allResults.push(...results.map(r => ({ ...r, _searchQuery: search.query })));
    searchesUsed++;
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Deduplicate by name + address
  const seen = new Set();
  const unique = allResults.filter(r => {
    const key = `${r.title}|${r.address}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  console.log(`\n📊 Total unique businesses: ${unique.length}`);
  console.log(`   Searches used: ${searchesUsed}/250\n`);
  
  // Save scrape job
  await supabasePost('scrape_jobs', {
    id: jobId, source: 'google_maps', status: 'completed',
    params: JSON.stringify({ searches: searches.map(s => s.query), region: 'Tri-Valley / East Bay' }),
    records_found: allResults.length, records_new: unique.length,
    records_duplicate: allResults.length - unique.length, errors: 0,
    started_at: ts, completed_at: now(), created_at: ts
  });
  
  // Insert leads
  let inserted = 0;
  for (const biz of unique) {
    const leadId = ulid();
    const industry = extractIndustry(biz.type ? [biz.type] : biz.types, biz.title);
    
    // Parse city/state from address
    const addressParts = (biz.address || '').split(',').map(s => s.trim());
    const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
    const stateZip = addressParts.length >= 1 ? addressParts[addressParts.length - 1] : '';
    const state = stateZip.split(' ')[0] || 'CA';
    
    const lead = {
      id: leadId,
      company_name: biz.title,
      website: biz.website || biz.link || null,
      industry,
      employee_count: null,
      revenue_range: null,
      city: city || null,
      state: state || 'CA',
      country: 'US',
      tech_stack: JSON.stringify(['Google Business']),
      source: 'google_maps',
      scrape_job_id: jobId,
      confidence_score: biz.rating ? Math.min(Math.round(biz.rating * 20), 100) : 50,
      created_at: ts,
      updated_at: ts,
    };
    
    try {
      await supabasePost('leads', lead);
      
      // Create contact from business info
      if (biz.phone) {
        await supabasePost('contacts', {
          id: ulid(), lead_id: leadId,
          full_name: 'Business Owner',
          title: 'Owner / Manager',
          email: null,
          email_verified: false,
          phone: biz.phone,
          linkedin_url: null,
          is_decision_maker: true,
          created_at: ts,
        });
      }
      
      // Score the lead
      const scoreResult = scoreLead({
        industry,
        employeeCount: null,
        hasDecisionMaker: !!biz.phone,
        techStack: ['Google Business'],
        emailVerified: false,
      });
      
      await supabasePost('lead_scores', {
        id: ulid(), lead_id: leadId,
        total_score: scoreResult.totalScore, tier: scoreResult.tier,
        industry_match: scoreResult.industryMatch, employee_fit: scoreResult.employeeFit,
        decision_maker: scoreResult.decisionMaker, tech_match: scoreResult.techMatch,
        funding_event: 0, traffic_score: 0, email_verified_score: 0,
        disqualified: scoreResult.disqualified,
        disqualify_reason: scoreResult.disqualifyReason,
        scored_at: ts,
      });
      
      // Create deal
      await supabasePost('deals', {
        id: ulid(), lead_id: leadId,
        stage: 'new_lead',
        deal_value: '0',
        assigned_rep: 'Joseph Galindo',
        next_action: 'Initial outreach',
        next_action_date: new Date(Date.now() + Math.random() * 7 * 86400000).toISOString(),
        created_at: ts, updated_at: ts,
      });
      
      // Activity log
      await supabasePost('activities', {
        id: ulid(), lead_id: leadId,
        type: 'scrape',
        description: `Lead scraped from Google Maps: ${biz.title}${biz.rating ? ` (${biz.rating}★, ${biz.reviews || 0} reviews)` : ''}`,
        created_at: ts,
      });
      
      const ratingStr = biz.rating ? ` ⭐${biz.rating}` : '';
      const phoneStr = biz.phone ? ` 📞` : '';
      console.log(`   ✅ ${++inserted}. ${biz.title} — ${industry}${ratingStr}${phoneStr} [${scoreResult.tier}]`);
    } catch (err) {
      console.error(`   ❌ Failed: ${biz.title} — ${err.message}`);
    }
  }
  
  console.log(`\n🎉 Scrape complete!`);
  console.log(`   ${inserted} real leads added to your CRM`);
  console.log(`   View them at: https://b2b-leadgen-kappa.vercel.app/leads`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
