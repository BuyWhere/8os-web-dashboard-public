'use client'

/**
 * AssistantChat Component
 * Always-on conversational assistant embedded in the dashboard.
 * Features: streaming responses, tool execution, conversation history.
 */

import { useState, useRef, useEffect, useCallback } from 'react'

// ── SVG Icons ────────────────────────────────────────────────────────────────
const SendIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const BotIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
)

const UserIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const LoaderIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

const WrenchIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const PlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const MessageSquareIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: { id: string; name: string }[]
  createdAt?: string
}

interface ConversationSummary {
  id: string
  title: string | null
  updatedAt: string
  lastMessage?: { content: string | null }
}

interface AssistantChatProps {
  className?: string
  isExpanded?: boolean
  onToggleExpand?: () => void
}

// ── Tool display names ───────────────────────────────────────────────────────
const TOOL_NAMES: Record<string, string> = {
  get_goals: 'Reading goals',
  update_goal: 'Updating goal',
  get_projects: 'Reading projects',
  create_project: 'Creating project',
  update_project: 'Updating project',
  get_tasks: 'Reading tasks',
  create_task: 'Creating task',
  complete_task: 'Completing task',
  get_calendar_events: 'Reading calendar',
  create_calendar_event: 'Creating event',
  get_archetype_info: 'Reading archetype',
  get_energy_hours: 'Reading energy config',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AssistantChat({ className = '', isExpanded = true, onToggleExpand }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isExecutingTool, setIsExecutingTool] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Welcome message on new conversation
  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm your 8OS AI Assistant. I can help you manage your goals, projects, tasks, and calendar — all tailored to your archetype.\n\nWhat would you like to do?",
        },
      ])
    }
  }, [conversationId, messages.length])

  // Load conversation history list
  const loadConversations = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch('/api/assistant/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  // Load a specific conversation
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setConversationId(convId)
        setShowHistory(false)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [])

  // Start new conversation
  const newConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setShowHistory(false)
  }, [])

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let assistantContent = ''
      let currentMessageId = `assistant_${Date.now()}`
      let currentToolCalls: { id: string; name: string }[] = []

      setMessages((prev) => [
        ...prev,
        { id: currentMessageId, role: 'assistant', content: '' },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case 'content':
                assistantContent += data.content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
                break

              case 'tool_start':
                currentToolCalls = data.toolCalls
                setIsExecutingTool(true)
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageId
                      ? { ...msg, toolCalls: data.toolCalls }
                      : msg
                  )
                )
                break

              case 'tool_complete':
                setIsExecutingTool(false)
                break

              case 'done':
                setConversationId(data.conversationId)
                break

              case 'error':
                assistantContent += `\n\nError: ${data.error}`
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
                break
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
      setIsExecutingTool(false)
    }
  }, [input, isLoading, conversationId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={onToggleExpand}
        className={`fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${className}`}
        aria-label="Open assistant"
      >
        <BotIcon size={24} className="text-white" />
      </button>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 border-l border-gray-800 ${className}`}>
      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">Conversations</h3>
            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white text-xs">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center p-8 text-gray-400">
                <LoaderIcon size={16} />
                <span className="ml-2 text-xs">Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-xs">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                    conv.id === conversationId ? 'bg-gray-800' : ''
                  }`}
                >
                  <div className="text-sm text-white truncate">
                    {conv.title || 'New conversation'}
                  </div>
                  {conv.lastMessage?.content && (
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {conv.lastMessage.content.slice(0, 60)}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
            <BotIcon size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-gray-400">Powered by Flow AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { loadConversations(); setShowHistory(true) }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Conversation history"
          >
            <MessageSquareIcon size={16} />
          </button>
          <button
            onClick={newConversation}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="New conversation"
          >
            <PlusIcon size={16} />
          </button>
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Collapse assistant"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
                  <BotIcon size={16} className="mt-0.5 text-indigo-400 shrink-0" />
                )}
                {message.role === 'user' && (
                  <UserIcon size={16} />
                )}
                <div className="flex-1">
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.toolCalls.map((tc) => (
                        <div
                          key={tc.id}
                          className="flex items-center gap-2 text-xs text-gray-400 bg-gray-700/50 rounded px-2 py-1"
                        >
                          <WrenchIcon size={12} />
                          <span>{TOOL_NAMES[tc.name] || tc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {message.content === '' && isLoading && message.role === 'assistant' && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <LoaderIcon size={14} />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Tool execution indicator */}
      {isExecutingTool && (
        <div className="px-4 py-2 bg-indigo-900/30 border-t border-indigo-800/50">
          <div className="flex items-center gap-2 text-xs text-indigo-300">
            <WrenchIcon size={12} />
            <span>Executing tool...</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? (
              <LoaderIcon size={18} />
            ) : (
              <SendIcon size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
