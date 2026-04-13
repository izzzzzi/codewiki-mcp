export interface WrbFrame {
  rpcId: string
  payload: unknown
  rawPayload: unknown
}

const XSSI_PREFIX = ")]}'"

function stripXssiPrefix(text: string): string {
  const trimmed = text.trimStart()
  if (trimmed.startsWith(XSSI_PREFIX)) {
    return trimmed.slice(XSSI_PREFIX.length).trimStart()
  }
  return text
}

function safeJsonParse(input: string): unknown | undefined {
  try {
    return JSON.parse(input)
  }
  catch {
    return undefined
  }
}

function collectWrbFrames(node: unknown, out: WrbFrame[]): void {
  if (!Array.isArray(node)) {
    return
  }

  if (node.length >= 3 && node[0] === 'wrb.fr' && typeof node[1] === 'string') {
    const rpcId = node[1]
    const rawPayload = node[2]
    const payload = typeof rawPayload === 'string'
      ? (safeJsonParse(rawPayload) ?? rawPayload)
      : rawPayload
    out.push({ rpcId, payload, rawPayload })
  }

  for (const child of node) {
    collectWrbFrames(child, out)
  }
}

export function extractWrbFrames(responseText: string): WrbFrame[] {
  const body = stripXssiPrefix(responseText)
  const frames: WrbFrame[] = []

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('[') || !line.endsWith(']')) {
      continue
    }

    const parsed = safeJsonParse(line)
    if (parsed !== undefined) {
      collectWrbFrames(parsed, frames)
    }
  }

  if (frames.length === 0) {
    throw new Error('No wrb.fr frames found in batchexecute response')
  }

  return frames
}

export function extractRpcPayload(responseText: string, rpcId: string): unknown {
  const frames = extractWrbFrames(responseText)
  const match = frames.find(frame => frame.rpcId === rpcId)
  if (!match) {
    const available = frames.map(f => f.rpcId).join(', ')
    throw new Error(`RPC ID "${rpcId}" not found in batchexecute response (available: ${available})`)
  }
  return match.payload
}
