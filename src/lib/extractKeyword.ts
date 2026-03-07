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

const STOP_WORDS_RU = new Set([
  'репозиторий', 'репо', 'библиотека', 'библиотеки', 'фреймворк', 'пакет', 'модуль',
  'проект', 'инструмент', 'код', 'исходник', 'открытый',
  'как', 'что', 'где', 'какой', 'какая', 'какие', 'какого', 'кто', 'когда', 'зачем', 'почему',
  'такое', 'такой', 'такая', 'такие', 'таких', 'такого',
  'покажи', 'расскажи', 'найди', 'найти', 'ищи', 'искать', 'получи', 'посмотри', 'дай',
  'пожалуйста', 'можно', 'можешь', 'нужно', 'нужна', 'нужен', 'нужны',
  'это', 'этот', 'эта', 'эти', 'этого', 'тот', 'та', 'те',
  'для', 'про', 'при', 'или', 'его', 'её', 'мне', 'меня', 'себя',
  'есть', 'был', 'была', 'были', 'быть', 'будет',
  'все', 'всё', 'весь', 'вся', 'всех',
  'из', 'на', 'по', 'за', 'от', 'до', 'об',
  'не', 'ни', 'но', 'да', 'же', 'ли', 'бы',
  'управления', 'управление', 'состоянием', 'состояние',
  'работы', 'работа', 'устроен', 'устроена', 'работает',
  'лучшая', 'лучший', 'лучшие', 'лучше', 'самый', 'самая', 'самые',
])

const SKIP_POS = new Set(['PUNCT', 'SPACE', 'DET', 'ADP', 'CCONJ', 'SCONJ', 'AUX', 'PART', 'INTJ'])

const HAS_NON_LATIN = /[^\u0000-\u007F]/

function extractKeywordSimple(text: string): string | null {
  const tokens = text
    .split(/[\s,.:;!?()[\]{}"'«»]+/)
    .filter((t) => t.length > 1)
    .filter((t) => !STOP_WORDS.has(t.toLowerCase()) && !STOP_WORDS_RU.has(t.toLowerCase()))

  // Prefer Latin/mixed tokens (likely project names) over pure-Cyrillic tokens
  const latin = tokens.filter((t) => /[a-zA-Z0-9]/.test(t))
  return latin[0] ?? tokens[0] ?? null
}

export function extractKeyword(text: string): string | null {
  if (HAS_NON_LATIN.test(text)) {
    return extractKeywordSimple(text)
  }

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
