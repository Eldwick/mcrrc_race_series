-- Migration: Remove DEFAULT constraint from club column
-- This prevents future INSERTs from automatically getting 'MCRRC' as default

-- Remove the DEFAULT 'MCRRC' constraint from the club column
ALTER TABLE runners 
ALTER COLUMN club DROP DEFAULT;

-- Note: This keeps existing data as-is but prevents future defaults
-- New runners without a specified club will now have NULL instead of 'MCRRC'
