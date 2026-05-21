const https = require('https');

// Inline scoring logic
const ICP_CONFIG = {
  targetIndustries: ['Construction','Real Estate','Property Management','Manufacturing','Warehouse','Restaurant','Automotive','Healthcare','Retail','Hospitality'],
  employeeRange: { min: 1, max: 200 },
  targetTechStack: ['Angi','HomeAdvisor','Yelp','Google Business','Houzz','BuildZoom','Thumbtack'],
  minTrafficThreshold: 1000,
};
const WEIGHTS = { industryMatch:20, employeeFit:15, decisionMaker:20, techMatch:15, fundingEvent:15, trafficScore:10, emailVerified:5 };

function scoreLead(data) {
  const industryMatch = data.industry && ICP_CONFIG.targetIndustries.some(t => t.toLowerCase() === data.industry.toLowerCase()) ? WEIGHTS.industryMatch : 0;
  const employeeFit = data.employeeCount >= ICP_CONFIG.employeeRange.min && data.employeeCount <= ICP_CONFIG.employeeRange.max ? WEIGHTS.employeeFit : 0;
  const decisionMaker = data.hasDecisionMaker ? WEIGHTS.decisionMaker : 0;
  let techMatch = 0;
  try { const ts = typeof data.techStack === 'string' ? JSON.parse(data.techStack) : (data.techStack || []); techMatch = Math.min(ts.filter(t => ICP_CONFIG.targetTechStack.some(tt => tt.toLowerCase() === t.toLowerCase())).length * 5, WEIGHTS.techMatch); } catch {}
  const fundingEvent = data.hasFundingEvent ? WEIGHTS.fundingEvent : 0;
  const trafficScore = (data.monthlyTraffic || 0) >= ICP_CONFIG.minTrafficThreshold ? WEIGHTS.trafficScore : 0;
  const emailVerified = data.emailVerified ? WEIGHTS.emailVerified : 0;
  const totalScore = industryMatch + employeeFit + decisionMaker + techMatch + fundingEvent + trafficScore + emailVerified;
  const tier = totalScore >= 80 ? 'hot' : totalScore >= 50 ? 'warm' : 'cold';
  const disqualified = totalScore < 30;
  return { totalScore, tier, industryMatch, employeeFit, decisionMaker, techMatch, fundingEvent, trafficScore, emailVerified, disqualified, disqualifyReason: disqualified ? 'low_overall_score' : null };
}

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZW9pbW93cWludGp1bXhldHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMzMDc3NywiZXhwIjoyMDk0OTA2Nzc3fQ.Yh0VmFE3F8DF26MJZzQ7Ug0NqSkuc9xqaaicYh3pCjM';
const BASE = 'https://raeoimowqintjumxetsx.supabase.co/rest/v1';

function post(table, data) {
  const body = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const url = new (require('url').URL)(BASE + '/' + table);
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
        if (res.statusCode >= 400) reject(new Error(table + ': ' + res.statusCode + ' ' + d));
        else resolve({ status: res.statusCode, body: d });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function ulid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = Array.from({length:16}, () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random()*32)]).join('');
  return t + r;
}
function now() { return new Date().toISOString(); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString(); }

async function seed() {
  console.log('🌱 Seeding database via Supabase REST API...\n');
  const ts = now();

  const scrapeJobId = ulid();
  await post('scrape_jobs', {
    id: scrapeJobId, source: 'google_maps', status: 'completed',
    params: JSON.stringify({query:'commercial properties epoxy', location:'Livermore, CA'}),
    records_found: 10, records_new: 10, records_duplicate: 0, errors: 0,
    started_at: daysAgo(7), completed_at: daysAgo(7), created_at: ts
  });
  console.log('✅ Scrape job created');

  const seedLeads = [
    { companyName:'Tri-Valley Property Management', website:'https://trivalleypm.com', industry:'Property Management', employeeCount:18, revenueRange:'$2M-$5M', city:'Pleasanton', state:'CA', techStack:JSON.stringify(['Yelp','Google Business','Angi']), source:'google_maps' },
    { companyName:'Bay Area Commercial Realty', website:'https://bayareacommercialrealty.com', industry:'Real Estate', employeeCount:35, revenueRange:'$5M-$10M', city:'Walnut Creek', state:'CA', techStack:JSON.stringify(['Google Business','Yelp']), source:'referral' },
    { companyName:'Dublin Auto Body & Paint', website:'https://dublinautobody.com', industry:'Automotive', employeeCount:12, revenueRange:'$1M-$2M', city:'Dublin', state:'CA', techStack:JSON.stringify(['Google Business']), source:'google_maps' },
    { companyName:'Livermore Valley Cellars', website:'https://livermorevalleycellars.com', industry:'Food & Beverage', employeeCount:25, revenueRange:'$3M-$7M', city:'Livermore', state:'CA', techStack:JSON.stringify(['Yelp','Instagram']), source:'google_maps' },
    { companyName:'Fremont Industrial Supply', website:'https://fremontindustrial.com', industry:'Industrial Supply', employeeCount:42, revenueRange:'$8M-$15M', city:'Fremont', state:'CA', techStack:JSON.stringify(['Yelp','BBB','LinkedIn']), source:'apollo' },
    { companyName:'San Ramon CrossFit', website:'https://sanramoncrossfit.com', industry:'Fitness', employeeCount:8, revenueRange:'$500K-$1M', city:'San Ramon', state:'CA', techStack:JSON.stringify(['Instagram','Mindbody']), source:'google_maps' },
    { companyName:'Tracy Logistics Center', website:'https://tracylogistics.com', industry:'Logistics', employeeCount:110, revenueRange:'$20M-$50M', city:'Tracy', state:'CA', techStack:JSON.stringify(['SAP','Salesforce']), source:'apollo' },
    { companyName:'East Bay Dental Group', website:'https://eastbaydental.com', industry:'Healthcare', employeeCount:22, revenueRange:'$3M-$6M', city:'Pleasanton', state:'CA', techStack:JSON.stringify(['Google Business','Yelp']), source:'google_maps' },
    { companyName:'Concord Brewing Company', website:'https://concordbrewing.com', industry:'Food & Beverage', employeeCount:15, revenueRange:'$1M-$3M', city:'Concord', state:'CA', techStack:JSON.stringify(['Untappd','Instagram']), source:'referral' },
    { companyName:'Hayward Manufacturing Co', website:'https://haywardmfg.com', industry:'Manufacturing', employeeCount:85, revenueRange:'$15M-$25M', city:'Hayward', state:'CA', techStack:JSON.stringify(['SAP','LinkedIn']), source:'apollo' },
  ];

  const seedContacts = [
    { fullName:'Maria Santos', title:'Property Manager', email:'maria@trivalleypm.com', emailVerified:true, phone:'(925)555-0101', isDecisionMaker:true },
    { fullName:'James Chen', title:'Managing Director', email:'jchen@bayareacommercialrealty.com', emailVerified:true, phone:'(925)555-0202', isDecisionMaker:true },
    { fullName:'Mike Thompson', title:'Owner', email:'mike@dublinautobody.com', emailVerified:false, phone:'(925)555-0303', isDecisionMaker:true },
    { fullName:'Sarah Williams', title:'Operations Manager', email:'sarah@livermorevalleycellars.com', emailVerified:true, phone:'(925)555-0404', isDecisionMaker:false },
    { fullName:'Robert Kim', title:'Facilities Director', email:'rkim@fremontindustrial.com', emailVerified:true, phone:'(510)555-0505', isDecisionMaker:true },
    { fullName:'Jessica Martinez', title:'Owner', email:'jessica@sanramoncrossfit.com', emailVerified:true, phone:'(925)555-0606', isDecisionMaker:true },
    { fullName:'David Park', title:'VP Operations', email:'dpark@tracylogistics.com', emailVerified:true, phone:'(209)555-0707', isDecisionMaker:true },
    { fullName:'Lisa Nguyen', title:'Practice Manager', email:'lisa@eastbaydental.com', emailVerified:false, phone:'(925)555-0808', isDecisionMaker:false },
    { fullName:'Tom Baker', title:'Co-Founder', email:'tom@concordbrewing.com', emailVerified:true, phone:'(925)555-0909', isDecisionMaker:true },
    { fullName:'Patricia Johnson', title:'Plant Manager', email:'pjohnson@haywardmfg.com', emailVerified:true, phone:'(510)555-1010', isDecisionMaker:true },
  ];

  const stages = ['new_lead','contacted','qualified','demo_scheduled','proposal_sent','negotiating','closed_won','closed_lost','new_lead','contacted'];
  const dealValues = [8500, 15000, 12000, 22000, 45000, 6000, 75000, 9500, 11000, 35000];

  for (let i = 0; i < seedLeads.length; i++) {
    const lead = seedLeads[i];
    const contact = seedContacts[i];
    const leadId = ulid();
    const stage = stages[i];
    const createdAt = daysAgo(Math.floor(Math.random()*14)+1);

    await post('leads', {
      id: leadId, company_name: lead.companyName, website: lead.website, industry: lead.industry,
      employee_count: lead.employeeCount, revenue_range: lead.revenueRange, city: lead.city, state: lead.state,
      country: 'US', tech_stack: lead.techStack, source: lead.source,
      scrape_job_id: scrapeJobId, confidence_score: 70 + Math.floor(Math.random()*30),
      created_at: createdAt, updated_at: ts
    });

    await post('contacts', {
      id: ulid(), lead_id: leadId, full_name: contact.fullName, title: contact.title,
      email: contact.email, email_verified: contact.emailVerified, phone: contact.phone,
      linkedin_url: 'https://linkedin.com/in/' + contact.fullName.toLowerCase().replace(' ','-'),
      is_decision_maker: contact.isDecisionMaker, created_at: createdAt
    });

    const scoreResult = scoreLead({
      industry: lead.industry, employeeCount: lead.employeeCount,
      hasDecisionMaker: contact.isDecisionMaker, techStack: lead.techStack ? JSON.parse(lead.techStack) : [],
      hasFundingEvent: Math.random() > 0.7, monthlyTraffic: Math.floor(Math.random()*50000),
      emailVerified: contact.emailVerified
    });

    await post('lead_scores', {
      id: ulid(), lead_id: leadId, total_score: scoreResult.totalScore, tier: scoreResult.tier,
      industry_match: scoreResult.industryMatch, employee_fit: scoreResult.employeeFit,
      decision_maker: scoreResult.decisionMaker, tech_match: scoreResult.techMatch,
      funding_event: scoreResult.fundingEvent, traffic_score: scoreResult.trafficScore,
      email_verified_score: scoreResult.emailVerified, disqualified: scoreResult.disqualified,
      disqualify_reason: scoreResult.disqualifyReason || null, scored_at: ts
    });

    const dealId = ulid();
    await post('deals', {
      id: dealId, lead_id: leadId, stage: stage,
      deal_value: String(dealValues[i]), assigned_rep: 'Joseph Galindo',
      next_action: stage === 'new_lead' ? 'Initial outreach' : stage === 'contacted' ? 'Follow-up call' : 'Follow up on proposal',
      next_action_date: (stage !== 'closed_won' && stage !== 'closed_lost') ? new Date(Date.now() + Math.random()*7*86400000).toISOString() : null,
      close_date: (stage === 'closed_won' || stage === 'closed_lost') ? daysAgo(Math.floor(Math.random()*14)) : null,
      win_loss_reason: stage === 'closed_won' ? 'Great fit - signed for full epoxy install' : stage === 'closed_lost' ? 'Went with cheaper contractor' : null,
      created_at: createdAt, updated_at: ts
    });

    await post('activities', [
      { id: ulid(), lead_id: leadId, deal_id: dealId, type: 'scrape', description: 'Lead found via ' + lead.source, created_at: createdAt },
      { id: ulid(), lead_id: leadId, deal_id: dealId, type: 'score_update', description: 'Lead scored: ' + scoreResult.totalScore + '/100 (' + scoreResult.tier + ')', created_at: daysAgo(Math.floor(Math.random()*5)) },
    ]);

    console.log('✅ ' + (i+1) + '/10: ' + lead.companyName + ' → ' + stage);
  }

  console.log('\n🎉 Database seeded with 10 leads!');
}

seed().catch(e => { console.error('❌ ERROR:', e.message); process.exit(1); });
