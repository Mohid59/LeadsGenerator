#!/usr/bin/env node
// ============================================================================
// test-runner.js — Validates the filter against known test cases.
// Run:   node tests/test-runner.js
// Exits non-zero on any failure so this is CI-friendly.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { filterLeads } = require('../filter/filter');

const fixtures = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'sample-input.json'), 'utf8')
);

// Expected outcome for each test case (by place_id).
const expectations = {
  ChIJ_test_001: { pass: true,  why: 'no website + has phone + low reviews' },
  ChIJ_test_002: { pass: false, why: 'has website' },
  ChIJ_test_003: { pass: false, why: 'missing phone' },
  ChIJ_test_004: { pass: true,  why: 'null fields handled, has name + phone' },
  ChIJ_test_005: { pass: false, why: 'rating >= 4.2 AND reviews >= 50' },
  ChIJ_test_006: { pass: false, why: 'missing business_name' },
};

const { passed, rejected } = filterLeads(fixtures);

// Build a lookup by place_id
const result = {};
for (const l of passed)   result[l.place_id] = { actual: true,  data: l };
for (const l of rejected) result[l.place_id] = { actual: false, data: l };

let failures = 0;
console.log('\n=== LEAD FILTER TEST RESULTS ===\n');

for (const [placeId, exp] of Object.entries(expectations)) {
  const r = result[placeId];
  const ok = r && r.actual === exp.pass;
  const marker = ok ? 'PASS' : 'FAIL';
  const detail = r && !r.actual ? ` (reasons: ${r.data.rejection_reasons.join(', ')})` : '';
  console.log(`[${marker}] ${placeId}  expected=${exp.pass}  actual=${r ? r.actual : 'missing'}${detail}`);
  console.log(`        why: ${exp.why}`);
  if (!ok) failures++;
}

console.log(`\nSummary: ${Object.keys(expectations).length - failures}/${Object.keys(expectations).length} passed`);
console.log(`Filter output: ${passed.length} accepted, ${rejected.length} rejected\n`);

if (failures > 0) {
  console.error(`${failures} test(s) FAILED`);
  process.exit(1);
}
console.log('All tests passed.');
