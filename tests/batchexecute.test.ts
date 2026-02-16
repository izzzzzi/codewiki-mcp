import { describe, expect, it } from 'vitest'
import { extractRpcPayload, extractWrbFrames } from '../src/lib/batchexecute.js'

describe('batchexecute parser', () => {
  it('extracts wrb.fr frame with XSSI prefix and length lines', () => {
    const payload = [[['owner/repo', null, 3]]]
    const payloadJson = JSON.stringify(payload)
    const wrbLine = JSON.stringify([[
      'wrb.fr',
      'vyWDAf',
      payloadJson,
      null,
      null,
      null,
      'generic',
    ]])

    const text = `)]}'\n\n${wrbLine.length}\n${wrbLine}\n26\n[[\"e\",4,null,null,0]]\n`

    const frames = extractWrbFrames(text)
    expect(frames).toHaveLength(1)
    expect(frames[0].rpcId).toBe('vyWDAf')
    expect(frames[0].payload).toEqual(payload)
  })

  it('extracts specific RPC payload when multiple frames exist', () => {
    const firstPayload = ['one']
    const secondPayload = ['two']
    const line = JSON.stringify([
      ['wrb.fr', 'vyWDAf', JSON.stringify(firstPayload), null, null, null, 'generic'],
      ['wrb.fr', 'VSX6ub', JSON.stringify(secondPayload), null, null, null, 'generic'],
    ])

    const text = `)]}'\n${line}`

    expect(extractRpcPayload(text, 'VSX6ub')).toEqual(secondPayload)
  })

  it('throws when no wrb.fr frames found', () => {
    expect(() => extractWrbFrames(`)]}'\n42\n{}`)).toThrow('No wrb.fr frames found')
  })
})
