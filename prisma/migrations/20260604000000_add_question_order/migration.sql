-- Add order column to Question table
ALTER TABLE "Question" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set order for existing questions based on their ID order within each test
UPDATE "Question" q
SET "order" = t.seq
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "testId" ORDER BY id) - 1 AS seq
  FROM "Question"
) t
WHERE q.id = t.id;
