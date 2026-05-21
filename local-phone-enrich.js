#!/usr/bin/env node
// local-phone-enrich.js — Crawls websites for phone numbers and pushes to Supabase
// Targets leads that do NOT have an email (the ~50 leads email enrichment missed)
const fs = require('fs');
const https = require('https');
const http = require('http');

// ── Step 1: Re-fetch latest export data ──────────────────────────────────────
async function fetchExportData() {
  return new Promise((resolve, reject) => {
    https.get('https://b2b-leadgen-kappa.vercel.app/api/enrich/export', {
      headers: { 'Accept': 'application/json' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          let body = '';
          res2.on('data', c => body += c);
          res2.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        }).on('error', reject);
        return;
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`Parse error: ${body.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

// ── Phone number regex & extraction ──────────────────────────────────────────

// Matches US phone numbers in various formats:
// (925) 518-2985, 925-518-2985, 925.518.2985, +1-925-518-2985, +1 (925) 518-2985
// 1-800-555-1234, (800) 555-1234, 800.555.1234, +18005551234
const PHONE_REGEX = /(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)\d{3}[\s.\-]?\d{4}/g;

// More specific: require area code in parens or separated by dash/dot
const PHONE_PATTERNS = [
  // +1 (925) 518-2985 or +1-925-518-2985
  /\+1[\s.\-]?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/g,
  // (925) 518-2985
  /\(\d{3}\)\s?\d{3}[\s.\-]\d{4}/g,
  // 925-518-2985 or 925.518.2985
  /(?<!\d)\d{3}[\-\.]\d{3}[\-\.]\d{4}(?!\d)/g,
  // 1-800-555-1234
  /(?<!\d)1[\-\.]\d{3}[\-\.]\d{3}[\-\.]\d{4}(?!\d)/g,
  // tel: links with numbers like tel:+19255182985 or tel:9255182985
  /tel:[\+]?1?(\d{10})/gi,
  // href="tel:..." with formatted numbers
  /tel:[\+]?1?[\-\s.]?\(?\d{3}\)?[\-\s.]?\d{3}[\-\s.]?\d{4}/gi,
];

function normalizePhone(raw) {
  // Strip everything except digits
  const digits = raw.replace(/[^\d]/g, '');
  // Must have 10 or 11 digits (11 if starts with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.substring(1, 4);
    const mid = digits.substring(4, 7);
    const last = digits.substring(7, 11);
    return `(${area}) ${mid}-${last}`;
  }
  if (digits.length === 10) {
    const area = digits.substring(0, 3);
    const mid = digits.substring(3, 6);
    const last = digits.substring(6, 10);
    return `(${area}) ${mid}-${last}`;
  }
  return null; // Not a valid US phone
}

function extractPhones(html) {
  const phones = new Set();

  // First, check tel: links (most reliable)
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  let m;
  while ((m = telRegex.exec(html)) !== null) {
    const normalized = normalizePhone(m[1]);
    if (normalized && !isFaxNearby(html, m.index)) {
      phones.add(normalized);
    }
  }

  // Then check all phone patterns
  for (const pattern of PHONE_PATTERNS) {
    pattern.lastIndex = 0;
    while ((m = pattern.exec(html)) !== null) {
      const raw = m[0].replace(/^tel:/i, '');
      const normalized = normalizePhone(raw);
      if (normalized && !isFaxNearby(html, m.index)) {
        phones.add(normalized);
      }
    }
  }

  // General regex as fallback
  PHONE_REGEX.lastIndex = 0;
  while ((m = PHONE_REGEX.exec(html)) !== null) {
    const normalized = normalizePhone(m[0]);
    if (normalized && !isFaxNearby(html, m.index)) {
      phones.add(normalized);
    }
  }

  return Array.from(phones);
}

function isFaxNearby(html, matchIndex) {
  // Check 60 chars before and 30 chars after for fax-related words
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(html.length, matchIndex + 30);
  const context = html.substring(start, end).toLowerCase();
  return /\bfax\b/i.test(context) || /\bfacsimile\b/i.test(context) || /\bf:\s*$/i.test(context);
}

function scorePhone(phone, html, matchContext) {
  // Prefer numbers found in tel: links
  // Prefer numbers near "phone", "call", "tel" labels
  let score = 50;
  // Check if it appeared in a tel: href (most reliable)
  if (html.includes(`tel:`) && html.includes(phone.replace(/[^\d]/g, ''))) score += 30;
  return score;
}

// ── Shared utilities (from local-enrich.js) ──────────────────────────────────

function fetchPage(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error('timeout')); }, timeout);
    const mod = url.startsWith('https') ? https : http;

    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: timeout,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const u = new URL(url);
          redirectUrl = u.origin + redirectUrl;
        }
        fetchPage(redirectUrl, timeout).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        clearTimeout(timer);
        resolve('');
        return;
      }

      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => { clearTimeout(timer); resolve(body); });
      res.on('error', () => { clearTimeout(timer); resolve(''); });
    });

    req.on('error', () => { clearTimeout(timer); resolve(''); });
    req.on('timeout', () => { req.destroy(); clearTimeout(timer); resolve(''); });
  });
}

let SUPABASE_URL, SUPABASE_KEY;

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : true);
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function ulid() {
  const t = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const r = Array.from({length:16}, () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random()*32)]).join('');
  return t + r;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Phone crawling ───────────────────────────────────────────────────────────

async function crawlForPhones(website) {
  const allPhones = new Set();
  let pagesChecked = 0;

  let baseUrl = website.trim();
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

  try { new URL(baseUrl); } catch { return { phones: [], pagesChecked: 0 }; }

  // Skip social media URLs
  if (baseUrl.includes('facebook.com') || baseUrl.includes('yelp.com') || baseUrl.includes('instagram.com')) {
    return { phones: [], pagesChecked: 0 };
  }

  const pagePaths = ['/', '/contact', '/contact-us', '/about', '/about-us'];

  for (const path of pagePaths) {
    try {
      const url = new URL(path, baseUrl).toString();
      const html = await fetchPage(url);

      if (!html || html.length < 100) continue;
      pagesChecked++;

      const found = extractPhones(html);
      for (const phone of found) {
        allPhones.add(phone);
      }

      if (allPhones.size >= 3) break;
    } catch {
      continue;
    }
  }

  return { phones: Array.from(allPhones), pagesChecked };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📞 Phone Enrichment Script');
  console.log('══════════════════════════════════════════════════════════════\n');

  // Step 1: Re-fetch export data for current state
  console.log('🔄 Fetching latest lead data from export endpoint...');
  let data;
  try {
    data = await fetchExportData();
    // Save fresh copy
    fs.writeFileSync('/tmp/enrich_data.json', JSON.stringify(data, null, 2));
    console.log(`   ✅ Got ${data.leads.length} total leads\n`);
  } catch (err) {
    console.log(`   ⚠️  Could not fetch fresh data: ${err.message}`);
    console.log('   📂 Falling back to /tmp/enrich_data.json...');
    data = JSON.parse(fs.readFileSync('/tmp/enrich_data.json', 'utf8'));
    console.log(`   ✅ Loaded ${data.leads.length} leads from cache\n`);
  }

  SUPABASE_URL = data.config.url;
  SUPABASE_KEY = data.config.key;

  // Step 2: Filter to leads WITHOUT email
  const leadsWithoutEmail = data.leads.filter(lead => {
    // A lead has no email if the contacts don't have one
    return !lead.email;
  });

  console.log(`📋 Found ${leadsWithoutEmail.length} leads without email (targeting for phone enrichment)\n`);

  if (leadsWithoutEmail.length === 0) {
    console.log('🎉 All leads already have emails! Nothing to do.');
    return;
  }

  // Filter to only those with a website
  const leads = leadsWithoutEmail.filter(l => l.website && l.website.trim());
  const noWebsite = leadsWithoutEmail.length - leads.length;
  if (noWebsite > 0) {
    console.log(`   ⏭️  Skipping ${noWebsite} leads with no website\n`);
  }

  console.log(`🔍 Phone Enrichment — ${leads.length} leads to process\n`);

  let enriched = 0, notFound = 0, errors = 0, skipped = 0;
  const results = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const progress = `[${i + 1}/${leads.length}]`;

    try {
      const result = await crawlForPhones(lead.website);

      if (result.phones.length > 0) {
        const bestPhone = result.phones[0];
        enriched++;
        console.log(`✅ ${progress} ${lead.company.substring(0,40).padEnd(40)} → ${bestPhone}`);
        results.push({ company: lead.company, phone: bestPhone });

        // Update or create contact in Supabase
        if (lead.contactId) {
          await supabaseRequest('PATCH', `contacts?id=eq.${lead.contactId}`, {
            phone: bestPhone,
          });
        } else {
          await supabaseRequest('POST', 'contacts', {
            id: ulid(),
            lead_id: lead.id,
            full_name: 'General Contact',
            phone: bestPhone,
            is_decision_maker: false,
            created_at: new Date().toISOString(),
          });
        }

        // Log activity
        await supabaseRequest('POST', 'activities', {
          id: ulid(),
          lead_id: lead.id,
          type: 'enrichment',
          description: `Phone enriched: ${bestPhone}`,
          metadata: JSON.stringify({ allPhones: result.phones, pagesChecked: result.pagesChecked }),
          created_at: new Date().toISOString(),
        });
      } else if (result.pagesChecked === 0) {
        skipped++;
        console.log(`⏭️  ${progress} ${lead.company.substring(0,40).padEnd(40)} → skipped (unreachable)`);
      } else {
        notFound++;
        console.log(`❌ ${progress} ${lead.company.substring(0,40).padEnd(40)} → no phone (${result.pagesChecked} pages)`);
      }
    } catch (err) {
      errors++;
      console.log(`⚠️  ${progress} ${lead.company.substring(0,40).padEnd(40)} → error: ${err.message?.substring(0,50)}`);
    }

    // Small delay to be respectful
    await sleep(200);
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 PHONE ENRICHMENT COMPLETE`);
  console.log(`   📞 Phones found:  ${enriched}`);
  console.log(`   ❌ Not found:     ${notFound}`);
  console.log(`   ⏭️  Unreachable:   ${skipped}`);
  console.log(`   ⚠️  Errors:       ${errors}`);
  console.log(`${"═".repeat(60)}`);

  if (results.length > 0) {
    console.log(`\n📋 Phones Found:`);
    for (const r of results) {
      console.log(`   ${r.company.substring(0,45).padEnd(45)} ${r.phone}`);
    }
  }
}

main().catch(console.error);
