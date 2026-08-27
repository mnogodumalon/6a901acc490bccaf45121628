// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Testdaten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    status?: LookupValue;
    testdatum?: string; // Format: YYYY-MM-DD oder ISO String
    verantwortlich_vorname?: string;
    verantwortlich_nachname?: string;
    anmerkungen?: string;
  };
}

export const APP_IDS = {
  TESTDATEN: '6a901aab5f728b99067f67aa',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'testdaten': {
    status: [{ key: "offen", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "fehlgeschlagen", label: "Fehlgeschlagen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'testdaten': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'status': 'lookup/select',
    'testdatum': 'date/date',
    'verantwortlich_vorname': 'string/text',
    'verantwortlich_nachname': 'string/text',
    'anmerkungen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTestdaten = StripLookup<Testdaten['fields']>;