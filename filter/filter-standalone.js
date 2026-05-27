#!/usr/bin/env node
// ============================================================================
// filter-standalone.js
// Run the filter outside of n8n. Useful for one-off processing of an Apify
// dataset export when you don't want to run the full automation.
//
// Usage:
//   node filter-standalone.js <input.json> [output.json]
//
// <input.json>  = raw Apify dataset JSON (array of place objects)
// [output.json] = where to write filtered leads (default: ./leads.json)
// ============================================================================

const fs = require('fs');
const path = require('path');
const { filterLeads } = require('./filter');

function normalize(raw) {
  const normPhone = (p) => {
    if (!p) return null;
    const s = String(p).replace(/[^0-9+]/g, '');
    return s.length >= 7 ? s : null;
  };
  const normWebsite = (w) => {
    if (!w) return null;
    const s = String(w).trim().toLowerCase();
    if (!s || s === 'n/a' || s === 'null' || s === 'undefined') return null;
    if (s.includes('business.google.com') || s.includes('g.co/')) return null;
    return s;
  };

  return {
    business_name: raw.title || raw.name || null,
    phone: normPhone(raw.phone || raw.phoneUnformatted),
    address: raw.address || raw.street || null,
    city: raw.city || null,
    website: normWebsite(raw.website),
    rating: typeof raw.totalScore === 'number' ? raw.totalScore : (typeof raw.rating === 'number' ? raw.rating : null),
    reviews_count: typeof raw.reviewsCount === 'number' ? raw.reviewsCount : (typeof raw.reviews === 'number' ? raw.reviews : 0),
    category: raw.categoryName || (Array.isArray(raw.categories) ? raw.categories[0] : null),
    place_id: raw.placeId || raw.cid || null,
    latitude: raw.location ? raw.location.lat : null,
    longitude: raw.location ? raw.location.lng : null,
    source: 'google_maps_apify',
    scraped_at: new Date().toISOString(),
  };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || path.join(process.cwd(), 'leads.json');

  if (!inputPath) {
    console.error('Usage: node filter-standalone.js <input.json> [output.json]');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('Input must be a JSON array of Apify place objects.');
    process.exit(1);
  }

  const normalized = raw.map(normalize);
  const { passed, rejected } = filterLeads(normalized);

  fs.writeFileSync(outputPath, JSON.stringify(passed, null, 2));
  console.log(`Total:    ${raw.length}`);
  console.log(`Passed:   ${passed.length}  →  ${outputPath}`);
  console.log(`Rejected: ${rejected.length}`);
}

if (require.main === module) main();
