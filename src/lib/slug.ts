// URL slug helper. Used to derive route params from human-readable names
// so route paths and link targets stay in lockstep — change the rule here,
// every link and every route updates together. Example: "Sophia Bennett"
// → "sophia-bennett". Names are assumed unique enough within their domain
// (clients, staff) that this is reversible-by-lookup; if two people ever
// share a name we'll switch to ID-based slugs.
export function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-")
}

// Display fallback for when a slug arrives via URL but no data record matches
// it (e.g. typo'd or bookmarked URL). Lossy by design — punctuation and
// original casing aren't recoverable from a slug, so prefer pulling the
// canonical name from your data whenever the lookup succeeds. This is the
// "best-effort, never crash" path, not the "always correct" path.
export function unslug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
