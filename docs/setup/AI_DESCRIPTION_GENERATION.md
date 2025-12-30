# AI-Generated Bookshop Descriptions

This system generates 300-word descriptions for bookshops using ONLY verified data from the database and Google Places API. No hallucinations, no assumptions, no unverified claims.

## Architecture

The system consists of:

1. **Database Migration**: Adds columns for AI-generated descriptions
2. **Data Collection Function**: Gathers verified data for each bookshop
3. **Prompt Template**: Strict template that only allows using provided data
4. **Description Generation**: Calls Claude API to generate descriptions
5. **Validation Function**: Checks for hallucinations and quality issues
6. **Batch Processing**: Generates descriptions for all bookshops

## Setup

### 1. Run Database Migration

First, run the migration to add the necessary columns:

```sql
-- Run this in your Supabase SQL Editor
\i migrations/add-ai-description-columns.sql
```

Or manually execute the SQL in `migrations/add-ai-description-columns.sql`.

### 2. Set Environment Variables

Add these to your `.env` file or Vercel environment variables:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

Dependencies should already be installed, but verify:

```bash
npm install
```

## Usage

### Generate Sample Descriptions (Recommended First Step)

Generate 10 sample descriptions for manual review:

```bash
tsx scripts/generate-bookshop-descriptions.ts --sample=10
```

This will:
- Generate 10 descriptions
- Save them to `description-samples.json` for review
- Include validation results for each

**Review the samples carefully** before proceeding with batch generation.

### Batch Generate Descriptions

Generate descriptions for all bookshops without AI descriptions:

```bash
# Generate for first 100 bookshops (default)
tsx scripts/generate-bookshop-descriptions.ts

# Generate for specific batch size
tsx scripts/generate-bookshop-descriptions.ts --batch-size=50

# Custom delay between requests (default: 2000ms)
tsx scripts/generate-bookshop-descriptions.ts --delay=3000
```

## Implementation Details

### Verified Data Sources

The system uses ONLY these verified data sources:

- **Core Facts**: Name, city, state (from database)
- **Google Places Data**: Description, rating, review count (already verified)
- **Features**: Feature names from the features table (based on feature_ids)
- **Availability Flags**: Has website, has phone (boolean facts only)

### Validation Rules

The validation function checks for:

1. ✅ Word count in range (250-350 words)
2. ✅ No year/date mentions (unless verified)
3. ✅ No founder/owner names
4. ✅ No specific inventory claims
5. ✅ No award/media mentions
6. ✅ No unsupported superlatives
7. ✅ Bookshop name appears
8. ✅ Location (city, state) appears

### Prompt Structure

The prompt enforces a strict 4-paragraph structure:

1. **Introduction** (80-100 words): Bookshop and location
2. **What They Offer** (80-100 words): Services based on features
3. **Experience & Community** (70-90 words): Atmosphere and community value
4. **Call to Action** (50-70 words): Encouragement to visit

## Cost Estimation

- **Input**: ~500 tokens per request (prompt + data)
- **Output**: ~400 tokens (300-word description)
- **Total**: ~900 tokens per bookshop
- **Cost**: ~$0.01 per description (Claude Sonnet 4)
- **Total for 2,259 bookshops**: ~$22.59

## Testing Checklist

Before running batch generation:

- [ ] API key configured
- [ ] Database columns created
- [ ] Validation function tested
- [ ] 10 sample descriptions generated
- [ ] Samples manually reviewed
- [ ] No hallucinations detected
- [ ] Tone is appropriate
- [ ] Structure is consistent
- [ ] Ready for batch processing

## Troubleshooting

### API Errors

If you see API errors:
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API rate limits (default delay is 2 seconds)
- Verify the model name is correct (check Anthropic dashboard for available models)
  - Common models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
  - Update the model name in the script if needed

### Validation Failures

If descriptions fail validation:
- Check the validation issues in the console
- Review the prompt template
- Ensure verified data is complete

### Database Errors

If database updates fail:
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check that migration has been run
- Verify RLS policies allow updates

## Output Files

- `description-samples.json`: Sample descriptions for review (when using `--sample`)

## Next Steps

After generating descriptions:

1. Review a sample of generated descriptions
2. Update bookshop detail pages to use `ai_generated_description` field
3. Consider adding a fallback to original `description` if AI description doesn't exist
4. Set up periodic regeneration for new bookshops

