import Anthropic from '@anthropic-ai/sdk';

import { supabase } from '../lib/supabase';



const anthropic = new Anthropic({

  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,

});



function generateTemplateDescription(bookstore: any): string {

  const { name, city, state, google_rating, google_review_count } = bookstore;

  

  if (google_rating && google_rating >= 4.5 && google_review_count && google_review_count >= 50) {

    return `${name} is a highly-rated independent bookstore in ${city}, ${state}, with a ${google_rating}-star rating from ${google_review_count} Google reviews. This community bookshop offers a curated selection and welcoming atmosphere for readers.`;

  } else if (google_rating && google_rating >= 4.0 && google_review_count && google_review_count >= 10) {

    return `${name} serves the ${city}, ${state} community as an independent bookstore with a ${google_rating}-star rating from ${google_review_count} customers. This locally-owned bookshop provides a personalized experience and carefully selected books.`;

  } else if (google_rating && google_rating >= 4.0) {

    return `Located in ${city}, ${state}, ${name} is a community-focused independent bookstore with a ${google_rating}-star customer rating. This local bookshop offers a thoughtfully curated selection for readers of all ages.`;

  } else {

    return `${name} is an independent bookstore serving ${city}, ${state}. As a locally-owned bookshop, they offer a personalized selection and welcoming environment for readers.`;

  }

}



function validateTemplateDescription(description: string, bookstore: any): boolean {

  return description.includes(bookstore.name) &&

         description.includes(bookstore.city) &&

         description.includes(bookstore.state) &&

         description.length >= 100 && 

         description.length <= 400 &&

         !description.includes('undefined') &&

         !description.includes('null') &&

         description.split(' ').length >= 15;

}



async function generateWithAI(bookstore: any) {

  const prompt = `Generate a SHORT description (150-250 characters MAXIMUM) for this independent bookstore.



Name: ${bookstore.name}

Location: ${bookstore.city}, ${bookstore.state}

${bookstore.google_description ? `About: ${bookstore.google_description}` : ''}

${bookstore.google_rating ? `Rating: ${bookstore.google_rating}/5 (${bookstore.google_review_count} reviews)` : ''}



CRITICAL REQUIREMENTS:

- EXACTLY 2 sentences, no more

- 150-250 characters total

- Must mention: bookstore name, city, and state

- Focus on what makes them special

- NO phone numbers, addresses, hours, or calls-to-action

- NO promotional language

- Natural, factual tone



Output ONLY the description, nothing else.`;



  const message = await anthropic.messages.create({

    model: 'claude-sonnet-4-20250514',

    max_tokens: 200,

    messages: [{ role: 'user', content: prompt }]

  });



  const description = (message.content[0] as any).text.trim();

  

  const checks = [

    description.includes(bookstore.name),

    description.includes(bookstore.city),

    description.includes(bookstore.state),

    description.length >= 150 && description.length <= 400,

    !/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(description),

    !/\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)/i.test(description),

    !/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|am|pm)/i.test(description),

    !/award[- ]winning|acclaimed|beloved|treasured|iconic|legendary/i.test(description),

    description.split(' ').length >= 25 && description.split(' ').length <= 70

  ];

  

  const valid = checks.every(check => check === true);

  return { description, valid };

}



async function generateAllRemaining() {

  console.log('🚀 Starting complete description generation...\n');

  

  if (!supabase) {

    console.error('❌ Supabase client not available. Check your environment variables.');

    return;

  }

  

  // PHASE 1: Fix the 24 failed validations

  console.log('📋 PHASE 1: Regenerating failed validations with templates\n');

  

  const { data: failedBookshops, error: failedError } = await supabase

    .from('bookstores')

    .select('id, name, city, state, google_description, google_rating, google_review_count')

    .is('description_source', null)

    .not('ai_generated_description', 'is', null)

    .eq('description_validated', false)

    .not('city', 'is', null)

    .not('state', 'is', null);

  

  if (failedError) {

    console.error('Error fetching failed bookshops:', failedError);

  } else if (failedBookshops && failedBookshops.length > 0) {

    console.log(`Found ${failedBookshops.length} failed validations to regenerate\n`);

    

    for (let i = 0; i < failedBookshops.length; i++) {

      const bookshop = failedBookshops[i];

      console.log(`[${i + 1}/${failedBookshops.length}] Regenerating: ${bookshop.name}`);

      

      const description = generateTemplateDescription(bookshop);

      const valid = validateTemplateDescription(description, bookshop);

      

      const { error: updateError } = await supabase

        .from('bookstores')

        .update({

          ai_generated_description: description,

          description_validated: valid,

          description_source: 'template',

          updated_at: new Date().toISOString()

        })

        .eq('id', bookshop.id);

      

      if (updateError) {

        console.error(`  ❌ Update failed:`, updateError);

      } else {

        console.log(`  ✅ Template (${description.length} chars)`);

      }

    }

  } else {

    console.log('✅ No failed validations to regenerate\n');

  }

  

  // PHASE 2: Generate for the never-generated bookshops

  console.log('\n📋 PHASE 2: Generating descriptions for remaining bookshops\n');

  

  const { data: bookshops, error } = await supabase

    .from('bookstores')

    .select('id, name, city, state, google_description, google_rating, google_review_count')

    .is('description_source', null)

    .is('ai_generated_description', null)

    .not('city', 'is', null)

    .not('state', 'is', null)

    .order('google_description', { ascending: false, nullsFirst: false });

  

  if (error) {

    console.error('Error fetching bookshops:', error);

    return;

  }

  

  if (!bookshops || bookshops.length === 0) {

    console.log('✅ No bookshops need descriptions!\n');

  } else {

    console.log(`Found ${bookshops.length} bookshops needing generation\n`);

    

    const richData = bookshops.filter(b => b.google_description?.length >= 50);

    const sparseData = bookshops.filter(b => !b.google_description || b.google_description.length < 50);

    

    console.log(`📊 Breakdown:`);

    console.log(`  - Rich data (AI): ${richData.length}`);

    console.log(`  - Sparse data (Template): ${sparseData.length}\n`);

    

    const results = {

      ai_success: 0,

      template_success: 0,

      failed: 0,

      total: bookshops.length

    };

    

    for (let i = 0; i < bookshops.length; i++) {

      const bookshop = bookshops[i];

      const hasRichData = bookshop.google_description?.length >= 50;

      

      console.log(`[${i + 1}/${bookshops.length}] ${bookshop.name} (${bookshop.city}, ${bookshop.state})`);

      

      let generatedDescription: string;

      let descriptionSource: 'ai' | 'template';

      let validationPassed: boolean;

      

      try {

        if (hasRichData) {

          console.log(`  Trying AI...`);

          

          try {

            const aiResult = await generateWithAI(bookshop);

            generatedDescription = aiResult.description;

            validationPassed = aiResult.valid;

            

            if (validationPassed) {

              descriptionSource = 'ai';

              results.ai_success++;

              console.log(`  ✅ AI (${generatedDescription.length} chars)`);

            } else {

              console.log(`  ⚠️ AI validation failed, using template`);

              generatedDescription = generateTemplateDescription(bookshop);

              descriptionSource = 'template';

              validationPassed = validateTemplateDescription(generatedDescription, bookshop);

              results.template_success++;

              console.log(`  ✅ Template (${generatedDescription.length} chars)`);

            }

          } catch (aiError: any) {

            console.log(`  ❌ AI error: ${aiError.message}, using template`);

            generatedDescription = generateTemplateDescription(bookshop);

            descriptionSource = 'template';

            validationPassed = validateTemplateDescription(generatedDescription, bookshop);

            results.template_success++;

            console.log(`  ✅ Template (${generatedDescription.length} chars)`);

          }

          

          // Rate limit for AI calls

          await new Promise(resolve => setTimeout(resolve, 1000));

        } else {

          // Use template for sparse data

          generatedDescription = generateTemplateDescription(bookshop);

          descriptionSource = 'template';

          validationPassed = validateTemplateDescription(generatedDescription, bookshop);

          results.template_success++;

          console.log(`  ✅ Template (${generatedDescription.length} chars)`);

          

          // Shorter delay for templates

          await new Promise(resolve => setTimeout(resolve, 100));

        }

        

        // Update database

        const { error: updateError } = await supabase

          .from('bookstores')

          .update({

            ai_generated_description: generatedDescription,

            description_validated: validationPassed,

            description_source: descriptionSource,

            updated_at: new Date().toISOString()

          })

          .eq('id', bookshop.id);

        

        if (updateError) {

          console.error(`  ❌ DB update failed:`, updateError);

          results.failed++;

        }

        

      } catch (error: any) {

        results.failed++;

        console.error(`  ❌ Error: ${error.message}`);

      }

    }

    

    // Final report

    console.log('\n' + '='.repeat(60));

    console.log('📊 FINAL RESULTS - PHASE 2');

    console.log('='.repeat(60));

    console.log(`Total processed: ${results.total}`);

    console.log(`✅ AI: ${results.ai_success} (${(results.ai_success/results.total*100).toFixed(1)}%)`);

    console.log(`✅ Template: ${results.template_success} (${(results.template_success/results.total*100).toFixed(1)}%)`);

    console.log(`❌ Failed: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);

    

    const successRate = ((results.ai_success + results.template_success)/results.total*100).toFixed(1);

    console.log(`\n🎯 Success rate: ${successRate}%`);

  }

  

  // Get final overall stats

  const { data: stats } = await supabase

    .from('bookstores')

    .select('description_source, description_validated')

    .not('city', 'is', null)

    .not('state', 'is', null);

  

  if (stats) {

    const validatedCount = stats.filter(s => s.description_validated).length;

    const totalWithLocation = stats.length;

    console.log(`\n📈 OVERALL: ${validatedCount} / ${totalWithLocation} bookshops with locations have validated descriptions (${(validatedCount/totalWithLocation*100).toFixed(1)}%)`);

  }

}



generateAllRemaining().catch(console.error);

