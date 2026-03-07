import { describe, expect, it } from 'vitest'
import { extractKeyword } from '../src/lib/extractKeyword.js'

describe('extractKeyword', () => {
  it('extracts noun from simple query', () => {
    const result = extractKeyword('find the fastify framework')
    expect(result).toBe('fastify')
  })

  it('extracts proper noun', () => {
    const result = extractKeyword('tell me about React')
    expect(result).toBe('React')
  })

  it('filters stop words like "repository"', () => {
    const result = extractKeyword('show me the repository for express')
    expect(result).toBe('express')
  })

  it('returns null for all stop words', () => {
    const result = extractKeyword('show me the')
    expect(result).toBeNull()
  })

  it('handles single word input', () => {
    const result = extractKeyword('tensorflow')
    expect(result).toBe('tensorflow')
  })

  it('returns null for empty string', () => {
    const result = extractKeyword('')
    expect(result).toBeNull()
  })

  it('extracts keyword from Russian query about state management', () => {
    const result = extractKeyword('библиотеки для управления состоянием React')
    expect(result).toBe('React')
  })

  it('extracts keyword from Russian query about routing', () => {
    const result = extractKeyword('как устроен роутинг в Next.js')
    expect(result).toBe('Next')
  })

  it('extracts keyword from mixed Russian/English query', () => {
    const result = extractKeyword('покажи мне репозиторий fastify')
    expect(result).toBe('fastify')
  })

  it('extracts C# from Russian query', () => {
    const result = extractKeyword('что такое C# библиотека')
    expect(result).toBe('C#')
  })

  it('returns null for all-Russian-stop-words query', () => {
    const result = extractKeyword('библиотеки для управления состоянием')
    expect(result).toBeNull()
  })

  it('prefers Latin token over Cyrillic in mixed query', () => {
    const result = extractKeyword('роутинг в Next.js')
    expect(result).toBe('Next')
  })
})
