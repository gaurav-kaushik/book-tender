import { readFileSync } from 'fs'
import path from 'path'
import { parseClaudeResponse } from './parsers'
import type { IdentifiedBook } from './parsers'

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

export type { IdentifiedBook }

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

  return parseClaudeResponse(textContent.text)
}
