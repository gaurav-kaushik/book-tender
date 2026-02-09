import { readFileSync } from 'fs'
import path from 'path'

const SYSTEM_PROMPT = `You are a book identification expert. Analyze this photo of books and identify every book visible.

For each book you can identify, provide:
- title: The book's title
- author: The author's name
- spine_text: The exact text you can read on the spine (if visible)
- confidence: "high" (you're very sure), "medium" (likely correct but uncertain), or "low" (best guess based on partial information)
- position: approximate position in the image (e.g., "top-left", "middle-center", "bottom-right") to help the user cross-reference

If you can see a cover instead of a spine, note that.
If a book is partially obscured, still attempt identification and mark confidence accordingly.
If you cannot identify a book at all, include it as {"title": "Unknown", "confidence": "low", "spine_text": "<whatever text you can read>"} so the user can manually identify it.

Respond ONLY with a JSON array of book objects. No preamble, no markdown fences.`

export interface IdentifiedBook {
  title: string
  author: string
  spine_text?: string
  confidence: 'high' | 'medium' | 'low'
  position?: string
}

export async function identifyBooks(
  apiKey: string,
  photoPath: string
): Promise<IdentifiedBook[]> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const imageBuffer = readFileSync(photoPath)
  const base64 = imageBuffer.toString('base64')
  const ext = path.extname(photoPath).toLowerCase().replace('.', '')
  const mediaType =
    ext === 'jpg'
      ? 'image/jpeg'
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Identify all books in this photo.',
          },
        ],
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  try {
    const books = JSON.parse(textContent.text)
    if (!Array.isArray(books)) {
      throw new Error('Response is not an array')
    }
    return books.map((b: any) => ({
      title: b.title || 'Unknown',
      author: b.author || '',
      spine_text: b.spine_text || undefined,
      confidence: ['high', 'medium', 'low'].includes(b.confidence) ? b.confidence : 'low',
      position: b.position || undefined,
    }))
  } catch {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const books = JSON.parse(jsonMatch[0])
      return books.map((b: any) => ({
        title: b.title || 'Unknown',
        author: b.author || '',
        spine_text: b.spine_text || undefined,
        confidence: ['high', 'medium', 'low'].includes(b.confidence) ? b.confidence : 'low',
        position: b.position || undefined,
      }))
    }
    throw new Error('Failed to parse Claude response as JSON')
  }
}
