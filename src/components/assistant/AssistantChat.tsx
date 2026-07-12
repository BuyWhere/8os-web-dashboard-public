'use client'

/**
 * AssistantChat — the Coach conversation surface.
 * Warm editorial theme (cream/white/gold, Fraunces title). Streaming
 * responses + tool execution. Renders INSIDE the CoachPanel pop-up.
 *
 * Backend contract is unchanged: POST /api/assistant/chat (SSE stream),
 * /api/assistant/conversations[...] for history.
 *
 * Extras in this redesign:
 *  - Quick-capture secondary action (posts to /api/nlp, same as QuickAdd)
 *  - Mic button: Web Speech API on-device transcription where supported,
 *    otherwise MediaRecorder -> /api/assistant/transcribe (graceful stub).
 *    Hidden entirely when neither is available.
 */

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Warm editorial palette ───────────────────────────────────────────────
const INK = '#221F1A'
const GRAY = '#6B6257'
const MUTED = '#8A8175'
const CREAM = '#F7F3EC'
const CREAM_ALT = '#FBF7F0'
const SURFACE = '#FFFFFF'
const GOLD = '#B08637'
const GOLD_DARK = '#98722C'
const HAIRLINE = '#E7DFD2'
const GREEN = '#4F7A52'

// ── SVG Icons ────────────────────────────────────────────────────────────
const SendIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
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
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const HistoryIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
  </svg>
)
const MicIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" />
  </svg>
)
const ExpandIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
  </svg>
)
const CollapseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" />
  </svg>
)
const CloseIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const BoltIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

// ── Types ────────────────────────────────────────────────────────────────
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
  isLarge?: boolean
  onToggleSize?: () => void
  onClose?: () => void
}

const TOOL_NAMES: Record<string, string> = {
  get_goals: 'Reading goals', update_goal: 'Updating goal',
  get_projects: 'Reading projects', create_project: 'Creating project', update_project: 'Updating project',
  get_tasks: 'Reading tasks', create_task: 'Creating task', complete_task: 'Completing task',
  get_calendar_events: 'Reading calendar', create_calendar_event: 'Creating event',
  get_archetype_info: 'Reading archetype', get_energy_hours: 'Reading energy config',
}

// Web Speech API typing (kept loose; feature-detected at runtime)
type AnySpeechRecognition = {
  lang: string; continuous: boolean; interimResults: boolean
  start: () => void; stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

export default function AssistantChat({ isLarge = false, onToggleSize, onClose }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isExecutingTool, setIsExecutingTool] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [mode, setMode] = useState<'chat' | 'capture'>('chat')
  const [captureNote, setCaptureNote] = useState<string | null>(null)
  const [micSupported, setMicSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<AnySpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Feature-detect voice input once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    const hasSpeech = !!(w.SpeechRecognition || w.webkitSpeechRecognition)
    const hasRecorder = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
    setMicSupported(hasSpeech || hasRecorder)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (messages.length === 0 && !conversationId) {
      setMessages([{
        id: 'welcome', role: 'assistant',
        content: "Hi, I'm your 8os Coach. I can shape your goals, projects, tasks, and calendar around your archetype — or just capture a quick thought.\n\nWhat's on your mind?",
      }])
    }
  }, [conversationId, messages.length])

  const loadConversations = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch('/api/assistant/conversations')
      if (res.ok) { const data = await res.json(); setConversations(data.conversations || []) }
    } catch (err) { console.error('Failed to load conversations:', err) }
    finally { setIsLoadingHistory(false) }
  }, [])

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`)
      if (res.ok) { const data = await res.json(); setMessages(data.messages || []); setConversationId(convId); setShowHistory(false) }
    } catch (err) { console.error('Failed to load conversation:', err) }
  }, [])

  const newConversation = useCallback(() => {
    setMessages([]); setConversationId(null); setShowHistory(false)
  }, [])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return
    const userMessage: Message = { id: `user_${Date.now()}`, role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, conversationId }),
      })
      if (!response.ok) throw new Error('Failed to send message')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')
      const decoder = new TextDecoder()
      let assistantContent = ''
      const currentMessageId = `assistant_${Date.now()}`
      setMessages((prev) => [...prev, { id: currentMessageId, role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            switch (data.type) {
              case 'content':
                assistantContent += data.content
                setMessages((prev) => prev.map((m) => m.id === currentMessageId ? { ...m, content: assistantContent } : m))
                break
              case 'tool_start':
                setIsExecutingTool(true)
                setMessages((prev) => prev.map((m) => m.id === currentMessageId ? { ...m, toolCalls: data.toolCalls } : m))
                break
              case 'tool_complete': setIsExecutingTool(false); break
              case 'done': setConversationId(data.conversationId); break
              case 'error':
                assistantContent += `\n\nError: ${data.error}`
                setMessages((prev) => prev.map((m) => m.id === currentMessageId ? { ...m, content: assistantContent } : m))
                break
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [...prev, { id: `error_${Date.now()}`, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally { setIsLoading(false); setIsExecutingTool(false) }
  }, [input, isLoading, conversationId])

  // Quick-capture: same endpoint QuickAdd used (/api/nlp).
  const sendCapture = useCallback(async () => {
    if (!input.trim() || isLoading) return
    setIsLoading(true); setCaptureNote(null)
    try {
      const res = await fetch('/api/nlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: input.trim() }) })
      const data = await res.json()
      setCaptureNote(data?.message || (data?.type === 'task' ? 'Captured.' : 'Noted.'))
      setInput('')
    } catch { setCaptureNote('Something went wrong. Please try again.') }
    finally { setIsLoading(false) }
  }, [input, isLoading])

  // ── Voice input ─────────────────────────────────────────────────────────
  const startSpeechRecognition = useCallback((): boolean => {
    const w = window as unknown as { SpeechRecognition?: new () => AnySpeechRecognition; webkitSpeechRecognition?: new () => AnySpeechRecognition }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return false
    try {
      const rec = new Ctor()
      rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true
      rec.onresult = (e) => {
        let txt = ''
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
        setInput(txt)
      }
      rec.onerror = () => { setIsRecording(false) }
      rec.onend = () => { setIsRecording(false); recognitionRef.current = null }
      recognitionRef.current = rec
      rec.start(); setIsRecording(true)
      return true
    } catch { return false }
  }, [])

  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        try {
          const fd = new FormData(); fd.append('audio', blob, 'recording.webm')
          const res = await fetch('/api/assistant/transcribe', { method: 'POST', body: fd })
          const data = await res.json().catch(() => ({}))
          if (data?.text) setInput((prev) => (prev ? prev + ' ' : '') + data.text)
          else setCaptureNote(data?.message || 'Voice transcription is coming soon.')
        } catch { setCaptureNote('Voice transcription is coming soon.') }
      }
      mediaRecorderRef.current = mr
      mr.start(); setIsRecording(true)
    } catch { setIsRecording(false); setCaptureNote('Microphone permission was denied.') }
  }, [])

  const toggleMic = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
      setIsRecording(false)
      return
    }
    // Prefer on-device Web Speech; fall back to MediaRecorder + transcribe.
    if (!startSpeechRecognition()) void startMediaRecorder()
  }, [isRecording, startSpeechRecognition, startMediaRecorder])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (mode === 'capture') void sendCapture(); else void sendMessage()
    }
  }

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 8, background: 'transparent',
    border: 'none', color: GRAY, cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: SURFACE, fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif' }}>
      {/* History overlay */}
      {showHistory && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: SURFACE, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${HAIRLINE}` }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: INK }}>Conversations</h3>
            <button onClick={() => setShowHistory(false)} style={{ ...iconBtn, width: 'auto', padding: '0 8px', fontSize: 12, color: GRAY }}>Close</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingHistory ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: MUTED }}>
                <LoaderIcon size={16} /><span style={{ marginLeft: 8, fontSize: 12 }}>Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: MUTED, fontSize: 12 }}>No conversations yet</div>
            ) : conversations.map((conv) => (
              <button key={conv.id} onClick={() => loadConversation(conv.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: `1px solid ${HAIRLINE}`, background: conv.id === conversationId ? CREAM : 'transparent', border: 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: 13.5, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title || 'New conversation'}</div>
                {conv.lastMessage?.content && (
                  <div style={{ fontSize: 11.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>{conv.lastMessage.content.slice(0, 70)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${HAIRLINE}`, background: CREAM_ALT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              <path d="M12 8.5v4M10 10.5h4" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif-coach), Georgia, serif', fontSize: 16, fontWeight: 600, color: INK, letterSpacing: '-0.01em' }}>Coach</h3>
            <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Your 8os companion</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button onClick={() => { loadConversations(); setShowHistory(true) }} style={iconBtn} title="History" aria-label="Conversation history"
            onMouseEnter={(e) => { e.currentTarget.style.background = CREAM; e.currentTarget.style.color = INK }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GRAY }}><HistoryIcon size={16} /></button>
          <button onClick={newConversation} style={iconBtn} title="New conversation" aria-label="New conversation"
            onMouseEnter={(e) => { e.currentTarget.style.background = CREAM; e.currentTarget.style.color = INK }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GRAY }}><PlusIcon size={16} /></button>
          {onToggleSize && (
            <button onClick={onToggleSize} style={iconBtn} title={isLarge ? 'Shrink' : 'Expand'} aria-label={isLarge ? 'Shrink coach' : 'Expand coach'}
              onMouseEnter={(e) => { e.currentTarget.style.background = CREAM; e.currentTarget.style.color = INK }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GRAY }}>{isLarge ? <CollapseIcon size={16} /> : <ExpandIcon size={16} />}</button>
          )}
          {onClose && (
            <button onClick={onClose} style={iconBtn} title="Close" aria-label="Close coach"
              onMouseEnter={(e) => { e.currentTarget.style.background = CREAM; e.currentTarget.style.color = INK }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GRAY }}><CloseIcon size={18} /></button>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: `1px solid ${HAIRLINE}`, background: SURFACE }}>
        {([['chat', 'Chat'], ['capture', 'Quick capture']] as const).map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setCaptureNote(null) }}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              background: mode === m ? '#F2E9D6' : 'transparent', color: mode === m ? '#7A5A1E' : GRAY,
              border: `1px solid ${mode === m ? '#E7DAC0' : HAIRLINE}`, transition: 'all 0.12s' }}>
            {m === 'capture' && <span style={{ marginRight: 5 }}><BoltIcon size={11} /></span>}{label}
          </button>
        ))}
      </div>

      {/* Messages / capture body */}
      {mode === 'chat' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: CREAM }}>
          {messages.map((message) => (
            <div key={message.id} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '86%', borderRadius: 14,
                borderTopRightRadius: message.role === 'user' ? 4 : 14,
                borderTopLeftRadius: message.role === 'user' ? 14 : 4,
                padding: '9px 13px',
                background: message.role === 'user' ? `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)` : SURFACE,
                color: message.role === 'user' ? '#fff' : INK,
                border: message.role === 'user' ? 'none' : `1px solid ${HAIRLINE}`,
                boxShadow: '0 1px 2px rgba(34,31,26,0.04)' }}>
                {message.content && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message.content}</p>}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {message.toolCalls.map((tc) => (
                      <div key={tc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: GRAY, background: CREAM, borderRadius: 6, padding: '3px 8px' }}>
                        <WrenchIcon size={12} /><span>{TOOL_NAMES[tc.name] || tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {message.content === '' && isLoading && message.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED }}>
                    <LoaderIcon size={14} /><span style={{ fontSize: 12 }}>Thinking...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: CREAM }}>
          <div style={{ fontSize: 13.5, color: GRAY, lineHeight: 1.6, marginBottom: 14 }}>
            Drop a quick task or thought and I'll file it. Try <em>"Gym at 7pm"</em> or <em>"I feel stressed"</em>.
          </div>
          {captureNote && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: SURFACE, border: `1px solid ${HAIRLINE}`, color: GREEN, fontWeight: 600, fontSize: 13.5 }}>
              ✓ {captureNote}
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Gym at 7pm', 'Read for 30 minutes', 'Team call tomorrow at 3pm'].map((ex) => (
              <button key={ex} onClick={() => setInput(ex)}
                style={{ padding: '4px 11px', borderRadius: 999, background: SURFACE, border: `1px solid ${HAIRLINE}`, color: GRAY, fontSize: 12, cursor: 'pointer' }}>{ex}</button>
            ))}
          </div>
        </div>
      )}

      {isExecutingTool && (
        <div style={{ padding: '8px 16px', background: '#F2E9D6', borderTop: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#7A5A1E' }}>
            <WrenchIcon size={12} /><span>Working on it...</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: 12, borderTop: `1px solid ${HAIRLINE}`, background: SURFACE }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {micSupported && (
            <button onClick={toggleMic} title={isRecording ? 'Stop recording' : 'Record voice'} aria-label={isRecording ? 'Stop recording' : 'Record voice'}
              style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: isRecording ? '#7A3B2E' : CREAM, color: isRecording ? '#fff' : GOLD,
                border: `1px solid ${isRecording ? '#7A3B2E' : HAIRLINE}`, transition: 'all 0.12s' }}
              className={isRecording ? 'animate-pulse' : ''}>
              <MicIcon size={16} />
            </button>
          )}
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={mode === 'capture' ? 'Capture a task or thought...' : 'Ask your coach anything...'} rows={1}
            style={{ flex: 1, background: CREAM, color: INK, borderRadius: 10, padding: '9px 13px', fontSize: 13.5, resize: 'none',
              border: `1px solid ${HAIRLINE}`, outline: 'none', minHeight: 40, maxHeight: 120, fontFamily: 'inherit', lineHeight: 1.5 }} />
          <button onClick={() => (mode === 'capture' ? sendCapture() : sendMessage())} disabled={!input.trim() || isLoading} aria-label="Send"
            style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DARK} 100%)`, color: '#fff', border: 'none',
              cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || isLoading) ? 0.5 : 1, transition: 'opacity 0.12s' }}>
            {isLoading ? <LoaderIcon size={18} /> : <SendIcon size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
