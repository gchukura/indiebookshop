-- SQL Queries for Database-Level Description Validation
-- Run these in Supabase SQL Editor for quick validation

-- ============================================================================
-- QUERY 1: Descriptions that are too short (<150 characters)
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  LENGTH(ai_generated_description) as description_length,
  LEFT(ai_generated_description, 100) as description_preview
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND LENGTH(ai_generated_description) < 150
  AND city IS NOT NULL
  AND state IS NOT NULL
ORDER BY LENGTH(ai_generated_description)
LIMIT 50;

-- ============================================================================
-- QUERY 2: Descriptions that are too long (>400 characters)
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  LENGTH(ai_generated_description) as description_length,
  LEFT(ai_generated_description, 100) as description_preview
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND LENGTH(ai_generated_description) > 400
  AND city IS NOT NULL
  AND state IS NOT NULL
ORDER BY LENGTH(ai_generated_description) DESC
LIMIT 50;

-- ============================================================================
-- QUERY 3: Descriptions missing required elements (name, city, or state)
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  CASE 
    WHEN ai_generated_description NOT LIKE '%' || name || '%' THEN 'Missing name'
    WHEN ai_generated_description NOT LIKE '%' || city || '%' THEN 'Missing city'
    WHEN ai_generated_description NOT LIKE '%' || state || '%' THEN 'Missing state'
    ELSE 'OK'
  END as missing_element,
  LEFT(ai_generated_description, 150) as description_preview
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND city IS NOT NULL
  AND state IS NOT NULL
  AND (
    ai_generated_description NOT LIKE '%' || name || '%'
    OR ai_generated_description NOT LIKE '%' || city || '%'
    OR ai_generated_description NOT LIKE '%' || state || '%'
  )
LIMIT 50;

-- ============================================================================
-- QUERY 4: Descriptions with phone numbers
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND ai_generated_description ~ '\d{3}[-.]?\d{3}[-.]?\d{4}'
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 5: Descriptions with street addresses
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND ai_generated_description ~* '\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|circle|ct)'
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 6: Descriptions with business hours references
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND (
    ai_generated_description ~* '(monday|tuesday|wednesday|thursday|friday|saturday|sunday)'
    OR ai_generated_description ~* '\d{1,2}:\d{2}\s*(am|pm)'
    OR ai_generated_description ~* 'open\s+(daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday)'
  )
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 7: Descriptions with promotional language
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND ai_generated_description ~* '(award[- ]winning|acclaimed|beloved|treasured|iconic|legendary|renowned|celebrated|esteemed)'
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 8: Descriptions with potential hallucinations (years/dates)
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND ai_generated_description ~ '\b(19|20)\d{2}\b'
  AND city IS NOT NULL
  AND state IS NOT NULL
  -- Exclude review counts (numbers followed by "review" or "customer")
  AND ai_generated_description !~* '\d+\s+(google\s+)?(review|customer|rating)'
LIMIT 50;

-- ============================================================================
-- QUERY 9: Descriptions with inventory/size claims
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND ai_generated_description ~* '\d+[\s,]+(books|volumes|titles|square feet|sq\.?\s*ft|floors|stories|levels)'
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 10: Descriptions with founding/establishment claims
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND (
    ai_generated_description ~* 'since\s+\d{4}'
    OR ai_generated_description ~* 'established\s+in'
    OR ai_generated_description ~* 'founded\s+in'
    OR ai_generated_description ~* 'opened\s+in'
    OR ai_generated_description ~* 'for over \d+ years'
    OR ai_generated_description ~* 'for more than \d+ years'
    OR ai_generated_description ~* 'long-standing'
    OR ai_generated_description ~* 'decades'
  )
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 11: Descriptions with unsupported superlatives
-- ============================================================================
SELECT 
  id,
  name,
  city,
  state,
  description_source,
  ai_generated_description
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND ai_generated_description ~* '(the first|the original|pioneer|the largest|the biggest|the oldest|the only)'
  AND city IS NOT NULL
  AND state IS NOT NULL
LIMIT 50;

-- ============================================================================
-- QUERY 12: Summary statistics by source
-- ============================================================================
SELECT 
  description_source,
  COUNT(*) as total_descriptions,
  COUNT(*) FILTER (WHERE LENGTH(ai_generated_description) >= 150 AND LENGTH(ai_generated_description) <= 400) as length_ok,
  COUNT(*) FILTER (WHERE LENGTH(ai_generated_description) < 150) as too_short,
  COUNT(*) FILTER (WHERE LENGTH(ai_generated_description) > 400) as too_long,
  ROUND(AVG(LENGTH(ai_generated_description))) as avg_length,
  MIN(LENGTH(ai_generated_description)) as min_length,
  MAX(LENGTH(ai_generated_description)) as max_length,
  COUNT(*) FILTER (WHERE ai_generated_description LIKE '%' || name || '%' 
                    AND ai_generated_description LIKE '%' || city || '%'
                    AND ai_generated_description LIKE '%' || state || '%') as has_all_required_elements
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND description_source IS NOT NULL
  AND city IS NOT NULL
  AND state IS NOT NULL
GROUP BY description_source
ORDER BY description_source;

-- ============================================================================
-- QUERY 13: Find duplicate or near-duplicate descriptions
-- ============================================================================
SELECT 
  ai_generated_description,
  COUNT(*) as occurrence_count,
  ARRAY_AGG(id ORDER BY id) as bookshop_ids,
  ARRAY_AGG(name ORDER BY id) as bookshop_names
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND city IS NOT NULL
  AND state IS NOT NULL
GROUP BY ai_generated_description
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC
LIMIT 20;

-- ============================================================================
-- QUERY 14: Overall validation summary
-- ============================================================================
SELECT 
  COUNT(*) as total_descriptions,
  COUNT(*) FILTER (WHERE description_validated = true) as validated,
  COUNT(*) FILTER (WHERE description_validated = false) as not_validated,
  COUNT(*) FILTER (WHERE LENGTH(ai_generated_description) >= 150 
                    AND LENGTH(ai_generated_description) <= 400
                    AND ai_generated_description LIKE '%' || name || '%'
                    AND ai_generated_description LIKE '%' || city || '%'
                    AND ai_generated_description LIKE '%' || state || '%'
                    AND ai_generated_description !~ '\d{3}[-.]?\d{3}[-.]?\d{4}'
                    AND ai_generated_description !~* '\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)') as passes_basic_validation
FROM bookstores
WHERE ai_generated_description IS NOT NULL
  AND city IS NOT NULL
  AND state IS NOT NULL;



