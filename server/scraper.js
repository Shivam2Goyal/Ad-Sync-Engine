import { chromium } from 'playwright'
import Groq from 'groq-sdk'
import 'dotenv/config'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Extract only visible text elements with their content — tiny token footprint
function extractTextElements(html) {
  // Pull out text from key HTML tags only
  const elements = []

  const patterns = [
    { tag: 'h1', regex: /<h1[^>]*>([\s\S]*?)<\/h1>/gi },
    { tag: 'h2', regex: /<h2[^>]*>([\s\S]*?)<\/h2>/gi },
    { tag: 'h3', regex: /<h3[^>]*>([\s\S]*?)<\/h3>/gi },
    { tag: 'button', regex: /<button[^>]*>([\s\S]*?)<\/button>/gi },
    { tag: 'a-cta', regex: /<a[^>]*(?:btn|button|cta)[^>]*>([\s\S]*?)<\/a>/gi },
    { tag: 'p', regex: /<p[^>]*>([\s\S]*?)<\/p>/gi },
    { tag: 'span', regex: /<span[^>]*class="[^"]*(?:badge|label|tag|subtitle)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi },
    { tag: 'div-stat', regex: /<div[^>]*class="[^"]*(?:stat|number|count|metric)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi },
    { tag: 'div-label', regex: /<div[^>]*class="[^"]*(?:label|desc|subtitle|tagline)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi },
    { tag: 'title', regex: /<title[^>]*>([\s\S]*?)<\/title>/gi },
  ]

  for (const { tag, regex } of patterns) {
    let match
    let count = 0
    while ((match = regex.exec(html)) !== null && count < 5) {
      // Strip inner HTML tags to get plain text
      const text = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (text && text.length > 2 && text.length < 300) {
        elements.push({ tag, original: text })
        count++
      }
    }
  }

  return elements.slice(0, 20) // max 20 elements
}

// Extract existing CSS color values from the page for context
function extractExistingColors(html) {
  const colorSet = new Set()
  // Match hex colors
  const hexRegex = /#[0-9a-fA-F]{3,8}/g
  let match
  while ((match = hexRegex.exec(html)) !== null) {
    colorSet.add(match[0].toLowerCase())
  }
  // Match rgb/rgba
  const rgbRegex = /rgba?\([^)]+\)/g
  while ((match = rgbRegex.exec(html)) !== null) {
    colorSet.add(match[0])
  }
  return [...colorSet].slice(0, 20)
}

// Extract CSS class names used in the page
function extractCssClasses(html) {
  const classSet = new Set()
  const classRegex = /class="([^"]+)"/g
  let match
  while ((match = classRegex.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(c => classSet.add(c))
  }
  return [...classSet].slice(0, 50)
}

// Apply text replacements to the original full HTML
function applyChanges(originalHtml, changes) {
  let modified = originalHtml

  for (const change of changes) {
    if (!change.before || !change.after) continue
    // Escape special regex characters in the before text
    const escaped = change.before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'g')
    modified = modified.replace(regex, change.after)
  }

  return modified
}

// Inject CSS override block right before </head>
function injectStyleOverrides(html, cssOverrides) {
  if (!cssOverrides || cssOverrides.trim().length === 0) return html

  const styleBlock = `
<!-- AD-SYNC: Style overrides to match ad creative -->
<style id="ad-sync-overrides">
${cssOverrides}
</style>`

  // Insert before </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleBlock}\n</head>`)
  }
  // Fallback: insert at the beginning
  return styleBlock + html
}

export async function generatePersonalizedPage({ adFile, adUrl, pageUrl }) {

  // ── Step 1: Scrape the FULL landing page (keep original intact) ───────────
  console.log('[1/5] Launching browser to scrape:', pageUrl)
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 })
  } catch {
    await page.waitForTimeout(5000)
  }

  const originalHtml = await page.content()
  await browser.close()

  console.log('[1/5] Scraped HTML length:', originalHtml.length)

  if (!originalHtml || originalHtml.length < 200) {
    throw new Error('Could not scrape the landing page. Check the URL and try again.')
  }

  // ── Step 2: Analyze ad with Groq Vision — DEEP analysis including colors ──
  console.log('[2/5] Analyzing ad creative...')
  let adAnalysis = ''

  if (adFile) {
    const base64Image = adFile.buffer.toString('base64')
    const mimeType = adFile.mimetype

    const visionResponse = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 800,
      temperature: 0.15,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` }
          },
          {
            type: 'text',
            text: `Analyze this ad creative in detail. Return ONLY valid JSON, no markdown, no code fences:
{
  "offer": "the main offer or value proposition shown",
  "audience": "who this ad targets",
  "tone": "emotional tone (e.g. bold, luxurious, playful, urgent, warm, techy, minimal)",
  "headline": "the main headline text visible in the ad",
  "cta": "call to action text visible, or a suitable one",
  "style": "visual style (e.g. dark, neon, pastel, corporate, earthy, vibrant)",
  "primary_color": "the dominant color in the ad as a hex code (e.g. #FF5722)",
  "secondary_color": "the second most prominent color as hex (e.g. #1A1A2E)",
  "accent_color": "accent/highlight color as hex (e.g. #FFD700)",
  "text_color": "main text color as hex",
  "background_color": "background color as hex",
  "brand_name": "brand name visible in the ad or null",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "mood": "overall mood (e.g. energetic, calm, premium, discount, exclusive)"
}`
          }
        ]
      }]
    })

    adAnalysis = visionResponse.choices[0].message.content

  } else if (adUrl) {
    const urlResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.15,
      messages: [{
        role: 'user',
        content: `Based on this ad URL: ${adUrl}, infer what the ad is about and what it likely looks like.
Return ONLY valid JSON, no markdown, no code fences:
{
  "offer": "main offer",
  "audience": "target audience",
  "tone": "emotional tone",
  "headline": "likely headline",
  "cta": "call to action",
  "style": "visual style",
  "primary_color": "dominant color as hex, based on the brand/URL",
  "secondary_color": "secondary color as hex",
  "accent_color": "accent color as hex",
  "text_color": "text color as hex",
  "background_color": "background color as hex",
  "brand_name": "brand name",
  "keywords": ["keyword1", "keyword2"],
  "mood": "overall mood"
}`
      }]
    })

    adAnalysis = urlResponse.choices[0].message.content
  }

  // Parse ad analysis safely
  adAnalysis = adAnalysis.replace(/```json|```/g, '').trim()
  let parsedAd
  try {
    parsedAd = JSON.parse(adAnalysis)
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = adAnalysis.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        parsedAd = JSON.parse(jsonMatch[0])
      } catch {
        parsedAd = null
      }
    }
    if (!parsedAd) {
      parsedAd = {
        offer: 'Special promotion',
        audience: 'General audience',
        tone: 'Friendly',
        headline: 'Get started today',
        cta: 'Learn More',
        style: 'Clean and modern',
        primary_color: '#6366f1',
        secondary_color: '#1e1b4b',
        accent_color: '#f59e0b',
        text_color: '#ffffff',
        background_color: '#0f172a',
        brand_name: null,
        keywords: ['promotion', 'offer'],
        mood: 'energetic'
      }
    }
  }

  console.log('[2/5] Ad analysis:', JSON.stringify(parsedAd, null, 2))

  // ── Step 3: Extract text elements + existing colors from HTML ─────────────
  const textElements = extractTextElements(originalHtml)
  const existingColors = extractExistingColors(originalHtml)
  const cssClasses = extractCssClasses(originalHtml)

  console.log('[3/5] Extracted', textElements.length, 'text elements,', existingColors.length, 'colors,', cssClasses.length, 'classes')

  if (textElements.length === 0) {
    throw new Error('Could not extract text elements from the page.')
  }

  // ── Step 4: Ask Groq for text replacements ───────────────────────────────
  console.log('[4/5] Generating text replacements...')
  const groqResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1500,
    temperature: 0.25,
    messages: [
      {
        role: 'system',
        content: `You are an elite CRO (Conversion Rate Optimization) expert and copywriter. 
You will be given text elements from a landing page and a detailed ad analysis.
Your job is to rewrite the text to create a seamless experience — when someone clicks the ad and lands on this page, the messaging, tone, and language should feel like a natural continuation of the ad.

Rules:
- Rewrite text to match the ad's offer, tone, audience, and keywords
- Keep new text similar in length to original (±20% words)
- Sound natural and compelling, never robotic
- The "before" field must be the EXACT original text — character for character
- Prioritize headlines, CTAs, and hero descriptions
- Make the page feel like it was BUILT for this specific ad campaign
Return ONLY valid JSON — no markdown, no explanation, no code fences.`
      },
      {
        role: 'user',
        content: `AD ANALYSIS:
${JSON.stringify(parsedAd, null, 2)}

LANDING PAGE TEXT ELEMENTS:
${JSON.stringify(textElements, null, 2)}

Pick the 5-8 most impactful elements to change. Rewrite them to match the ad's offer, tone, and audience.

Return ONLY this JSON:
{
  "changes": [
    { "element": "h1", "before": "exact original text", "after": "new personalized text" },
    { "element": "button", "before": "exact original text", "after": "new text" }
  ]
}`
      }
    ]
  })

  const raw = groqResponse.choices[0].message.content
  const clean = raw.replace(/```json|```/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        throw new Error('AI returned malformed output for text changes. Please try again.')
      }
    } else {
      throw new Error('AI returned malformed output for text changes. Please try again.')
    }
  }

  // ── Step 5: Generate CSS style overrides to match ad visual identity ──────
  console.log('[5/5] Generating visual style overrides...')

  const styleResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are an expert web designer who specializes in visual personalization.
You will receive:
1. An ad's visual analysis (colors, mood, style, tone)
2. The existing CSS colors used on a landing page
3. The CSS class names used on the page

Your job: Generate CSS overrides that transform the page's visual identity to match the ad creative.
The page structure stays the same, but the LOOK AND FEEL must change to feel like this page was designed specifically for that ad campaign.

Rules:
- Use the ad's colors (primary, secondary, accent) to replace the page's existing color scheme
- Override backgrounds, text colors, button colors, gradients, borders
- Use !important on overrides to ensure they apply
- Target generic selectors AND specific class names from the page
- Add subtle visual enhancements: gradients, shadows, transitions
- Keep typography readable — don't use colors with poor contrast
- If the ad has a dark mood, make the page darker. If vibrant, make it vibrant.
- Override nav/header backgrounds, hero sections, CTA buttons, section backgrounds
- Return ONLY valid CSS — no markdown, no explanation, no code fences, no \`\`\``
      },
      {
        role: 'user',
        content: `AD VISUAL IDENTITY:
- Primary Color: ${parsedAd.primary_color || '#6366f1'}
- Secondary Color: ${parsedAd.secondary_color || '#1e1b4b'}
- Accent Color: ${parsedAd.accent_color || '#f59e0b'}
- Text Color: ${parsedAd.text_color || '#ffffff'}
- Background Color: ${parsedAd.background_color || '#0f172a'}
- Style: ${parsedAd.style || 'modern'}
- Mood: ${parsedAd.mood || 'energetic'}
- Tone: ${parsedAd.tone || 'bold'}

EXISTING PAGE COLORS BEING USED:
${JSON.stringify(existingColors, null, 2)}

CSS CLASSES ON THE PAGE:
${JSON.stringify(cssClasses, null, 2)}

Generate comprehensive CSS overrides that visually transform this page to match the ad's color palette and mood.
Target these key areas:
1. body/html background
2. nav/header (background, text color, border)  
3. Hero section (background, h1 color, subtitle color)
4. Buttons (all buttons: background, color, hover states, border)
5. Section backgrounds (alternating sections)
6. Stats/numbers sections
7. Feature cards (background, border, text)
8. CTA banner sections
9. Footer
10. Accent elements (badges, labels, tags)
11. Links and interactive elements

Return ONLY raw CSS. No markdown fences. No explanations.`
      }
    ]
  })

  let cssOverrides = styleResponse.choices[0].message.content
  // Clean up any markdown fences that might have leaked in
  cssOverrides = cssOverrides.replace(/```css|```/g, '').trim()
  // Remove any leading explanation text before actual CSS
  const firstCssRule = cssOverrides.indexOf('{')
  if (firstCssRule > 0) {
    // Check if there's a selector before the first {
    const beforeBrace = cssOverrides.substring(0, firstCssRule).trim()
    // If the text before the first { looks like prose (has sentence-like structure), strip it
    if (beforeBrace.includes('. ') || beforeBrace.startsWith('Here') || beforeBrace.startsWith('The')) {
      // Find the last newline before a CSS selector
      const lines = cssOverrides.split('\n')
      let cssStart = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^[a-z.*#@\[\s]/i) && lines[i].includes('{')) {
          cssStart = i
          break
        }
        // Also check if next line starts with valid CSS selector
        if (i + 1 < lines.length && lines[i + 1] && lines[i + 1].trim().match(/^[a-z.*#@\[\s]/i)) {
          cssStart = i + 1
          break
        }
      }
      cssOverrides = lines.slice(cssStart).join('\n')
    }
  }

  console.log('[5/5] CSS overrides length:', cssOverrides.length)

  // ── Step 6: Assemble the final personalized HTML ─────────────────────────
  const baseTag = `<base href="${pageUrl}" target="_blank">`
  let finalHtml = originalHtml.replace('<head>', `<head>${baseTag}`)
  
  // Apply text changes
  finalHtml = applyChanges(finalHtml, parsed.changes)
  
  // Inject style overrides (AFTER text changes, BEFORE </head>)
  finalHtml = injectStyleOverrides(finalHtml, cssOverrides)

  console.log('=== FINAL HTML HAS STYLE:', finalHtml.includes('<style'))
  console.log('=== FINAL HTML HAS OVERRIDES:', finalHtml.includes('ad-sync-overrides'))
  console.log('=== FINAL HTML LENGTH:', finalHtml.length)

  return {
    changes: parsed.changes || [],
    html: finalHtml,
    changesCount: parsed.changes?.length || 0,
    adAnalysis: parsedAd,
    cssOverrides: cssOverrides
  }
}
