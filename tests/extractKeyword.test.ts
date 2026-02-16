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
})
