-- Better Auth 1.7 requires an id field on the rateLimit model. Backfill
-- existing rows before making it non-null and moving the primary key from key.
ALTER TABLE "rateLimit" ADD COLUMN id text;
UPDATE "rateLimit" SET id = gen_random_uuid()::text WHERE id IS NULL;
ALTER TABLE "rateLimit" ALTER COLUMN id SET NOT NULL;
ALTER TABLE "rateLimit" DROP CONSTRAINT "rateLimit_pkey";
ALTER TABLE "rateLimit" ADD CONSTRAINT "rateLimit_pkey" PRIMARY KEY (id);
ALTER TABLE "rateLimit" ADD CONSTRAINT "rateLimit_key_key" UNIQUE (key);
