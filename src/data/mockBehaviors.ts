// Tracked behaviors per client, keyed by URL slug. Each behavior is a
// clinically significant target that staff count and annotate with ABC context
// during a live session.
export interface Behavior {
  id: string
  name: string
}

export const mockBehaviors: Record<string, Behavior[]> = {
  "sophia-bennett": [
    { id: "b-sb-1", name: "Elopement" },
    { id: "b-sb-2", name: "Tantrum / Crying" },
    { id: "b-sb-3", name: "Hand-biting (SIB)" },
  ],
  "liam-anderson": [
    { id: "b-la-1", name: "Aggression — hitting" },
    { id: "b-la-2", name: "Non-compliance" },
    { id: "b-la-3", name: "Property destruction" },
  ],
  "ethan-carter": [
    { id: "b-ec-1", name: "Tantrum / Screaming" },
    { id: "b-ec-2", name: "Non-compliance" },
  ],
  "mia-davis": [
    { id: "b-md-1", name: "Aggression — biting" },
    { id: "b-md-2", name: "Non-compliance" },
    { id: "b-md-3", name: "Self-stimulatory behavior" },
  ],
  "noah-edwards": [
    { id: "b-ne-1", name: "Elopement" },
    { id: "b-ne-2", name: "Tantrum / Crying" },
  ],
  "olivia-foster": [
    { id: "b-of-1", name: "Non-compliance" },
    { id: "b-of-2", name: "Vocal outbursts" },
  ],
  "lucas-hayes": [
    { id: "b-lh-1", name: "Non-compliance" },
    { id: "b-lh-2", name: "Property destruction" },
  ],
  "ava-hughes": [
    { id: "b-ah-1", name: "Tantrum / Crying" },
    { id: "b-ah-2", name: "Head-hitting (SIB)" },
  ],
}
