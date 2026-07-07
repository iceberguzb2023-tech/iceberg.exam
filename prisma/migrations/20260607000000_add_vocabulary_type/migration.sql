-- Add VOCABULARY to QuestionType enum
ALTER TYPE "QuestionType" ADD VALUE 'VOCABULARY';

-- Add vocabularyItems column to Question table
ALTER TABLE "Question" ADD COLUMN "vocabularyItems" JSONB;

-- Change score from Int to Float in Submission table
ALTER TABLE "Submission" ALTER COLUMN "score" TYPE DOUBLE PRECISION;
