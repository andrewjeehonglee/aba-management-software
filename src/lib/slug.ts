// URL slug helper. Used to derive route params from human-readable names
// so route paths and link targets stay in lockstep — change the rule here,
// every link and every route updates together. Example: "Sophia Bennett"
// → "sophia-bennett". Names are assumed unique enough within their domain
// (clients, staff) that this is reversible-by-lookup; if two people ever
// share a name we'll switch to ID-based slugs.
export function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-")
}
