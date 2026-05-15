// Specialty is a free-form string. The dropdown surfaces the most common
// surgical specialties from the database; the underlying field can hold
// any NPI taxonomy label.
export type Specialty = string;

// Curated list shown in the dashboard filter. Ordered by relevance to
// med device sales (volume in the underlying data).
export const SPECIALTY_OPTIONS: string[] = [
  "General Surgery",
  "Plastic Surgery",
  "Thoracic Surgery",
  "Vascular Surgery",
  "Urology",
  "Surgical Oncology",
  "Colon & Rectal Surgery",
  "Trauma Surgery",
  "Pediatric Surgery",
  "Obstetrics & Gynecology",
];

export interface Surgeon {
  id: string;            // NPI, used as URL key
  npi: string;
  name: string;
  credentials: string;
  specialty: Specialty;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  email: string | null;
  affiliations: string[];
  research: { title: string; url: string | null }[];
  tier?: string | null;
  kolScore?: number | null;
}

export interface UserTerritory {
  states: string[];
  zips: string[];
}
