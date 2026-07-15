/**
 * Flow AI API Client
 * OpenAI-compatible chat completions via https://api.flowaiapi.com
 */

const FLOW_AI_API_URL = 'https://api.flowaiapi.com'
const FLOW_AI_API_KEY = process.env.FLOW_AI_API_KEY

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface StreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    delta: Partial<ChatMessage>
    finish_reason: string | null
  }[]
}

/**
 * Create a chat completion (non-streaming)
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string
    tools?: Tool[]
    tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
    temperature?: number
    max_tokens?: number
  } = {}
): Promise<ChatCompletionResponse> {
  const response = await fetch(`${FLOW_AI_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FLOW_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || 'auto',
      messages,
      tools: options.tools,
      tool_choice: options.tool_choice || 'auto',
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4096,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Flow AI API error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Create a streaming chat completion
 */
export async function createStreamingChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string
    tools?: Tool[]
    tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
    temperature?: number
    max_tokens?: number
  } = {}
): Promise<ReadableStream> {
  const response = await fetch(`${FLOW_AI_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FLOW_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || 'auto',
      messages,
      tools: options.tools,
      tool_choice: options.tool_choice || 'auto',
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4096,
      stream: true,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Flow AI API error: ${response.status} - ${error}`)
  }

  return response.body!
}

/**
 * Parse a streaming chunk
 */
export function parseStreamChunk(line: string): StreamChunk | null {
  if (!line.startsWith('data: ')) return null
  const data = line.slice(6)
  if (data === '[DONE]') return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
