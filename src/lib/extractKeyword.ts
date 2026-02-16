import winkNLP from 'wink-nlp'
import model from 'wink-eng-lite-web-model'

const nlp = winkNLP(model)
const its = nlp.its

const STOP_WORDS = new Set([
  'repo', 'repository', 'library', 'framework', 'package', 'module',
  'project', 'tool', 'code', 'source', 'open', 'github', 'gitlab',
  'the', 'a', 'an', 'this', 'that', 'about', 'for', 'with', 'from',
  'how', 'what', 'where', 'which', 'who', 'when', 'why', 'does',
  'show', 'tell', 'me', 'find', 'search', 'get', 'fetch', 'look',
  'please', 'can', 'could', 'would', 'should', 'use', 'using',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'did', 'will', 'shall',
  'of', 'in', 'to', 'on', 'at', 'by', 'up', 'it', 'its',
])

const SKIP_POS = new Set(['PUNCT', 'SPACE', 'DET', 'ADP', 'CCONJ', 'SCONJ', 'AUX', 'PART', 'INTJ'])

export function extractKeyword(text: string): string | null {
  const doc = nlp.readDoc(text)
  const tokens = doc.tokens()

  // First pass: look for NOUN/PROPN that aren't stop words
  const nouns: string[] = []
  const fallback: string[] = []

  tokens.each((token: any) => {
    const pos = token.out(its.pos) as string
    const value = token.out(its.value) as string
    const lower = value.toLowerCase()

    if (SKIP_POS.has(pos) || value.length <= 1) return

    if (!STOP_WORDS.has(lower)) {
      if (pos === 'NOUN' || pos === 'PROPN') {
        nouns.push(value)
      } else {
        fallback.push(value)
      }
    }
  })

  // Prefer nouns, then fall back to any non-stop-word token
  return nouns[0] ?? fallback[0] ?? null
}
