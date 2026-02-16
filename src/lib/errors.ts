export type ErrorCode = 'VALIDATION' | 'RPC_FAIL' | 'TIMEOUT' | 'NLP_RESOLVE_FAIL'

export class CodeWikiError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number | undefined
  readonly rpcId: string | undefined

  constructor(
    code: ErrorCode,
    message: string,
    options?: { statusCode?: number; rpcId?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'CodeWikiError'
    this.code = code
    this.statusCode = options?.statusCode
    this.rpcId = options?.rpcId
  }
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    rpcId?: string
    statusCode?: number
  }
}

export function formatMcpError(err: unknown): { content: { type: 'text'; text: string }[]; isError: true } {
  if (err instanceof CodeWikiError) {
    const envelope: ErrorEnvelope = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.rpcId ? { rpcId: err.rpcId } : {}),
        ...(err.statusCode ? { statusCode: err.statusCode } : {}),
      },
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
      isError: true,
    }
  }

  const message = err instanceof Error ? err.message : String(err)
  const envelope: ErrorEnvelope = {
    error: {
      code: 'RPC_FAIL',
      message,
    },
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
    isError: true,
  }
}
