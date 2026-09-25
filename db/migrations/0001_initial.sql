CREATE TYPE business_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'nurturing');

CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_id_idx ON session("userId");

CREATE TABLE account (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_user_id_idx ON account("userId");

CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE "rateLimit" (
  key text PRIMARY KEY,
  count integer NOT NULL,
  "lastRequest" bigint NOT NULL
);

CREATE TABLE business (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_member (
  business_id uuid NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role business_role NOT NULL DEFAULT 'member',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_member_pk PRIMARY KEY (business_id, user_id)
);
CREATE INDEX business_member_user_idx ON business_member(user_id);
CREATE UNIQUE INDEX business_member_one_default_per_user_uq ON business_member(user_id) WHERE is_default;

CREATE TABLE lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  role varchar(160),
  company varchar(200),
  email varchar(320),
  industry varchar(120),
  status lead_status NOT NULL DEFAULT 'new',
  source varchar(80) NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_business_id_id_uq UNIQUE (business_id, id)
);
CREATE INDEX lead_business_created_idx ON lead(business_id, created_at, id);
CREATE INDEX lead_business_status_idx ON lead(business_id, status);

CREATE TABLE lead_search (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  query jsonb NOT NULL,
  provider varchar(80) NOT NULL DEFAULT 'manual',
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_search_business_created_idx ON lead_search(business_id, created_at);

CREATE TABLE lead_score (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version varchar(80) NOT NULL DEFAULT 'rules-v1',
  scored_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_score_tenant_lead_fk FOREIGN KEY (business_id, lead_id)
    REFERENCES lead(business_id, id) ON DELETE CASCADE
);
CREATE INDEX lead_score_business_lead_created_idx ON lead_score(business_id, lead_id, created_at);
