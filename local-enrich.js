#!/usr/bin/env node
// local-enrich.js — Runs locally to crawl websites and push results to Supabase
const fs = require('fs');
const https = require('https');
const http = require('http');

const data = JSON.parse(fs.readFileSync('/tmp/enrich_data.json', 'utf8'));
const SUPABASE_URL = data.config.url;
const SUPABASE_KEY = data.config.key;
const leads = data.leads;

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const IGNORE_DOMAINS = new Set([
  "example.com", "sentry.io", "wixpress.com", "wordpress.com",
  "gravatar.com", "googleapis.com", "w3.org", "schema.org",
  "googleusercontent.com", "gstatic.com", "facebook.com",
  "twitter.com", "instagram.com", "youtube.com", "cloudflare.com",
  "cloudfront.net", "amazonaws.com", "jquery.com", "bootstrapcdn.com",
  "google.com", "yahoo.com", "hotmail.com", "outlook.com",
  "aol.com", "icloud.com", "mail.com", "protonmail.com",
  "yandex.com", "zoho.com", "domain.com", "email.com",
  "mailservice.com", "user.com", "sentry-next.wixpress.com",
  "fonts.googleapis.com", "maps.googleapis.com",
  "2x.webp", "rfuenzalida.com",
]);

const JUNK_PREFIXES = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply",
  "mailer-daemon", "postmaster", "webmaster",
  "abuse", "hostmaster", "root", "daemon", "wordpress", "wix",
  "user", "your", "mymail", "admin",
]);

function isValidBusinessEmail(email) {
  const lower = email.toLowerCase();
  const local = lower.split("@")[0];
  const domain = lower.split("@")[1];
  if (!domain) return false;
  if (IGNORE_DOMAINS.has(domain)) return false;
  if (JUNK_PREFIXES.has(local)) return false;
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".svg")) return false;
  if (lower.endsWith(".gif") || lower.endsWith(".webp") || lower.endsWith(".css")) return false;
  if (lower.endsWith(".js") || lower.endsWith(".woff") || lower.endsWith(".woff2")) return false;
  if (lower.includes("..") || lower.startsWith(".") || lower.startsWith("-")) return false;
  if (domain.split(".").length < 2) return false;
  if (/\d+\.\d+\.\d+/.test(lower)) return false;
  // Skip if domain looks like a file extension
  if (domain.endsWith(".webp") || domain.endsWith(".png")) return false;
  return true;
}

function scoreEmail(email) {
  const prefix = email.toLowerCase().split("@")[0];
  if (prefix === "info" || prefix === "contact" || prefix === "hello") return 100;
  if (prefix === "sales" || prefix === "inquiries" || prefix === "inquiry") return 90;
  if (prefix === "office" || prefix === "front" || prefix === "reception") return 80;
  if (prefix.includes(".") || prefix.includes("_")) return 70;
  if (prefix === "general" || prefix === "team" || prefix === "mail") return 60;
  if (prefix === "support" || prefix === "help" || prefix === "service") return 40;
  return 50;
}

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
      // Handle redirects
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

async function crawlForEmails(website) {
  const allEmails = new Set();
  let pagesChecked = 0;

  let baseUrl = website.trim();
  if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
  
  try { new URL(baseUrl); } catch { return { emails: [], pagesChecked: 0 }; }
  
  // Skip facebook/social media URLs
  if (baseUrl.includes('facebook.com') || baseUrl.includes('yelp.com') || baseUrl.includes('instagram.com')) {
    return { emails: [], pagesChecked: 0 };
  }

  const pagePaths = ['/', '/contact', '/contact-us', '/about', '/about-us'];

  for (const path of pagePaths) {
    try {
      const url = new URL(path, baseUrl).toString();
      const html = await fetchPage(url);
      
      if (!html || html.length < 100) continue;
      pagesChecked++;

      // Extract emails
      const found = html.match(EMAIL_REGEX) || [];
      for (const email of found) {
        if (isValidBusinessEmail(email)) allEmails.add(email.toLowerCase());
      }

      // Check mailto: links
      const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
      let match;
      while ((match = mailtoRegex.exec(html)) !== null) {
        if (isValidBusinessEmail(match[1])) allEmails.add(match[1].toLowerCase());
      }

      // Decode HTML entities
      const decoded = html.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)));
      const decodedFound = decoded.match(EMAIL_REGEX) || [];
      for (const email of decodedFound) {
        if (isValidBusinessEmail(email)) allEmails.add(email.toLowerCase());
      }

      if (allEmails.size >= 3) break;
    } catch {
      continue;
    }
  }

  const sorted = Array.from(allEmails).sort((a, b) => scoreEmail(b) - scoreEmail(a));
  return { emails: sorted, pagesChecked };
}

// Supabase REST API helpers
function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${path}`, SUPABASE_URL);
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=minimal' : 'return=minimal',
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

async function main() {
  console.log(`🔍 Email Enrichment — ${leads.length} leads to process\n`);

  let enriched = 0, notFound = 0, errors = 0, skipped = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const progress = `[${String(i + 1).padStart(3)}/${leads.length}]`;

    try {
      const result = await crawlForEmails(lead.website);

      if (result.emails.length > 0) {
        const bestEmail = result.emails[0];
        enriched++;
        console.log(`✅ ${progress} ${lead.company.substring(0,40).padEnd(40)} → ${bestEmail}`);

        // Update or create contact in Supabase
        if (lead.contactId) {
          await supabaseRequest('PATCH', `contacts?id=eq.${lead.contactId}`, {
            email: bestEmail,
            email_verified: true,
          });
        } else {
          await supabaseRequest('POST', 'contacts', {
            id: ulid(),
            lead_id: lead.id,
            full_name: 'General Contact',
            email: bestEmail,
            email_verified: true,
            is_decision_maker: false,
            created_at: new Date().toISOString(),
          });
        }

        // Log activity
        await supabaseRequest('POST', 'activities', {
          id: ulid(),
          lead_id: lead.id,
          type: 'enrichment',
          description: `Email enriched: ${bestEmail}`,
          metadata: JSON.stringify({ allEmails: result.emails, pagesChecked: result.pagesChecked }),
          created_at: new Date().toISOString(),
        });
      } else if (result.pagesChecked === 0) {
        skipped++;
        console.log(`⏭️  ${progress} ${lead.company.substring(0,40).padEnd(40)} → skipped (unreachable)`);
      } else {
        notFound++;
        console.log(`❌ ${progress} ${lead.company.substring(0,40).padEnd(40)} → no email (${result.pagesChecked} pages)`);
      }
    } catch (err) {
      errors++;
      console.log(`⚠️  ${progress} ${lead.company.substring(0,40).padEnd(40)} → error: ${err.message?.substring(0,50)}`);
    }

    // Small delay to be respectful
    await sleep(150);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 ENRICHMENT COMPLETE`);
  console.log(`   ✅ Emails found:  ${enriched}`);
  console.log(`   ❌ Not found:     ${notFound}`);
  console.log(`   ⏭️  Unreachable:   ${skipped}`);
  console.log(`   ⚠️  Errors:       ${errors}`);
  console.log(`${"═".repeat(60)}`);
}

main().catch(console.error);
