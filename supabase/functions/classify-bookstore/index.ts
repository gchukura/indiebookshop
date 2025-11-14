// Supabase Edge Function: classify-bookstore
// Hybrid classification: Rules first, then AI for uncertain cases

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface Feature {
  slug: string
  name: string
  keywords: string[]
}

interface ClassificationResult {
  bookstoreId: number
  detectedFeatures: string[]
  confidence: 'high' | 'medium' | 'low'
  method: 'rules' | 'ai' | 'hybrid'
}

// Rule-based classification
function classifyByRules(description: string, features: Feature[]): string[] {
  if (!description) return []
  
  const lowerDesc = description.toLowerCase()
  const detected: string[] = []
  
  for (const feature of features) {
    // Check if any keyword matches
    const hasKeyword = feature.keywords.some(keyword => 
      lowerDesc.includes(keyword.toLowerCase())
    )
    
    if (hasKeyword) {
      detected.push(feature.slug)
    }
  }
  
  return detected
}

// AI-powered classification using Claude
async function classifyByAI(
  description: string, 
  name: string,
  features: Feature[]
): Promise<{ features: string[], confidence: number }> {
  
  const featureList = features.map(f => 
    `- ${f.slug}: ${f.name}`
  ).join('\n')
  
  const prompt = `Analyze this bookstore and identify which features/categories apply. Be conservative - only select features that are clearly indicated.

Bookstore Name: ${name}
Description: ${description}

Available Features:
${featureList}

Return ONLY a JSON object with this exact format:
{
  "features": ["feature-slug-1", "feature-slug-2"],
  "confidence": 0.85
}

Rules:
- Only include features explicitly mentioned or strongly implied
- confidence should be 0-1 (0.8+ = high confidence)
- If description is vague, return fewer features with lower confidence
- Don't infer features that aren't clearly present`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  })
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  const content = data.content[0].text
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response')
  }
  
  return JSON.parse(jsonMatch[0])
}

// Hybrid classification
async function hybridClassify(
  bookstore: any,
  features: Feature[]
): Promise<ClassificationResult> {
  
  // Step 1: Rule-based classification
  const ruleFeatures = classifyByRules(bookstore.description || '', features)
  
  // Step 2: Determine if AI is needed
  const descriptionLength = (bookstore.description || '').length
  const needsAI = descriptionLength > 100 && ruleFeatures.length < 3
  
  if (!needsAI) {
    // Rules found enough features
    return {
      bookstoreId: bookstore.id,
      detectedFeatures: ruleFeatures,
      confidence: ruleFeatures.length > 0 ? 'high' : 'low',
      method: 'rules'
    }
  }
  
  // Step 3: Use AI for deeper analysis
  try {
    const aiResult = await classifyByAI(
      bookstore.description,
      bookstore.name,
      features
    )
    
    // Merge AI and rule results (deduplicate)
    const combined = [...new Set([...ruleFeatures, ...aiResult.features])]
    
    return {
      bookstoreId: bookstore.id,
      detectedFeatures: combined,
      confidence: aiResult.confidence >= 0.8 ? 'high' : 
                  aiResult.confidence >= 0.6 ? 'medium' : 'low',
      method: ruleFeatures.length > 0 ? 'hybrid' : 'ai'
    }
  } catch (error) {
    console.error('AI classification failed, using rules only:', error)
    return {
      bookstoreId: bookstore.id,
      detectedFeatures: ruleFeatures,
      confidence: 'medium',
      method: 'rules'
    }
  }
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      })
    }
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    // Parse request
    const { bookstoreId, bookstoreIds, autoUpdate = true } = await req.json()
    
    // Determine which bookstores to classify
    let bookstoresToClassify: any[] = []
    
    if (bookstoreId) {
      // Single bookstore
      const { data, error } = await supabase
        .from('bookstores')
        .select('id, name, description, feature_ids')
        .eq('id', bookstoreId)
        .single()
      
      if (error) throw error
      bookstoresToClassify = [data]
      
    } else if (bookstoreIds && bookstoreIds.length > 0) {
      // Multiple bookstores
      const { data, error } = await supabase
        .from('bookstores')
        .select('id, name, description, feature_ids')
        .in('id', bookstoreIds)
      
      if (error) throw error
      bookstoresToClassify = data || []
      
    } else {
      // All bookstores without features (batch mode)
      const { data, error } = await supabase
        .from('bookstores')
        .select('id, name, description, feature_ids')
        .or('feature_ids.is.null,feature_ids.eq.{}')
        .limit(100) // Process in batches of 100
      
      if (error) throw error
      bookstoresToClassify = data || []
    }
    
    if (bookstoresToClassify.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No bookstores to classify',
          results: []
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
    
    // Fetch all features
    const { data: features, error: featuresError } = await supabase
      .from('features')
      .select('slug, name, keywords')
    
    if (featuresError) throw featuresError
    
    // Classify each bookstore
    const results: ClassificationResult[] = []
    
    for (const bookstore of bookstoresToClassify) {
      const result = await hybridClassify(bookstore, features)
      results.push(result)
      
      // Update database if autoUpdate is true
      if (autoUpdate && result.detectedFeatures.length > 0) {
        await supabase
          .from('bookstores')
          .update({ feature_ids: result.detectedFeatures })
          .eq('id', result.bookstoreId)
      }
    }
    
    // Calculate statistics
    const stats = {
      total: results.length,
      byMethod: {
        rules: results.filter(r => r.method === 'rules').length,
        ai: results.filter(r => r.method === 'ai').length,
        hybrid: results.filter(r => r.method === 'hybrid').length
      },
      byConfidence: {
        high: results.filter(r => r.confidence === 'high').length,
        medium: results.filter(r => r.confidence === 'medium').length,
        low: results.filter(r => r.confidence === 'low').length
      },
      avgFeaturesPerStore: (
        results.reduce((sum, r) => sum + r.detectedFeatures.length, 0) / results.length
      ).toFixed(2)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        stats,
        updated: autoUpdate
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
    
  } catch (error) {
    console.error('Classification error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
