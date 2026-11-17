export const schemaSql = `
CREATE TABLE IF NOT EXISTS beans (
  id uuid PRIMARY KEY,
  name varchar(80) NOT NULL CHECK (char_length(name) >= 2),
  origin text NOT NULL,
  roaster text,
  process text NOT NULL DEFAULT 'washed' CHECK (process IN ('washed', 'natural', 'honey', 'anaerobic', 'lainnya')),
  roast_level text NOT NULL DEFAULT 'medium' CHECK (roast_level IN ('light', 'medium', 'dark')),
  variety text,
  altitude_masl numeric CHECK (altitude_masl BETWEEN 0 AND 3000),
  roast_date date,
  flavor_notes text[] NOT NULL DEFAULT '{}',
  image_url text,
  notes varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brews (
  id uuid PRIMARY KEY,
  bean_id uuid NOT NULL REFERENCES beans(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('v60', 'french_press', 'aeropress', 'espresso', 'tubruk', 'moka_pot', 'cold_brew')),
  dose_grams numeric NOT NULL CHECK (dose_grams BETWEEN 5 AND 100),
  water_grams numeric NOT NULL CHECK (water_grams BETWEEN 20 AND 2000),
  water_temp_c numeric CHECK (water_temp_c BETWEEN 0 AND 100),
  grind_size text CHECK (grind_size IN ('extra_fine', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse')),
  grinder_setting text,
  brew_time_seconds numeric CHECK (brew_time_seconds BETWEEN 0 AND 86400),
  tds_percent numeric CHECK (tds_percent BETWEEN 0 AND 20),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cupping jsonb NOT NULL DEFAULT '{}',
  taste_tags text[] NOT NULL DEFAULT '{}',
  notes varchar(1000),
  is_favorite boolean NOT NULL DEFAULT false,
  brewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brews_bean_id_idx ON brews (bean_id);
CREATE INDEX IF NOT EXISTS brews_brewed_at_idx ON brews (brewed_at DESC);
`;

export const securitySql = `
ALTER TABLE beans ENABLE ROW LEVEL SECURITY;
ALTER TABLE brews ENABLE ROW LEVEL SECURITY;
`;
