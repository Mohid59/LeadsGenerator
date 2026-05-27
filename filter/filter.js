// ============================================================================
// filter.js — Lead filtering logic (single-output)
// ----------------------------------------------------------------------------
// Drop this code into an n8n "Code" node (mode: Run Once for All Items).
// Single output: only passed leads continue downstream.
//
// Rules (in priority order):
//   1) business_name  : MUST exist (unusable without it)
//   2) website        : MUST be null/empty (target = no website)
//   3) phone          : MUST exist and be >=7 digits (outreach channel)
//   4) rating         : null OR < 4.2 (low-rated = more receptive)
//   5) reviews_count  : null OR < 50  (small businesses = real opportunity)
// ============================================================================

function filterLeads(leads) {
  const passed = [];
  const rejected = [];

  for (const l of leads) {
    const noWebsite  = l.website === null || l.website === '' || l.website === undefined;
    const hasPhone   = typeof l.phone === 'string' && l.phone.replace(/\D/g, '').length >= 7;
    const hasName    = typeof l.business_name === 'string' && l.business_name.trim().length > 0;
    const lowRating  = l.rating == null || Number(l.rating) < 4.2;
    const lowReviews = (l.reviews_count ?? 0) < 50;

    const reasons = [];
    if (!hasName)    reasons.push('missing_business_name');
    if (!noWebsite)  reasons.push('has_website');
    if (!hasPhone)   reasons.push('missing_phone');
    if (!lowRating)  reasons.push('rating_too_high');
    if (!lowReviews) reasons.push('too_many_reviews');

    if (reasons.length === 0) {
      passed.push({ ...l, priority: 'high', filter_passed: true });
    } else {
      rejected.push({ ...l, filter_passed: false, rejection_reasons: reasons });
    }
  }

  return { passed, rejected };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterLeads };
}
