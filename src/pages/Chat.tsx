import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FoxMascot from '../components/FoxMascot'
import { db } from '../firebase'
import {
  collection, addDoc, doc, setDoc,
  serverTimestamp, query, orderBy, getDocs
} from 'firebase/firestore'

interface Message {
  id: string
  role: 'kira' | 'user'
  text: string
  time: string
}

type Mood = 'idle' | 'thinking' | 'happy' | 'talking' | 'encouraging'

const moodConfig = {
  idle: {
    animation: 'foxFloat 5s ease-in-out infinite',
    pill: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)', color: '#a78bfa' },
    icon: '✨', label: 'Ready to help',
  },
  thinking: {
    animation: 'foxThink 2s ease-in-out infinite',
    pill: { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', color: '#22d3ee' },
    icon: '🤔', label: 'Thinking...',
  },
  happy: {
    animation: 'foxBounce 0.9s ease-in-out infinite',
    pill: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#34d399' },
    icon: '🎉', label: 'Great job!',
  },
  talking: {
    animation: 'foxTalk 0.35s ease-in-out infinite',
    pill: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
    icon: '💬', label: 'Explaining...',
  },
  encouraging: {
    animation: 'foxFloat 3s ease-in-out infinite',
    pill: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    icon: '💪', label: "You've got this!",
  },
}

const suggestions = [
  'Make me a weekly study plan',
  'What should I learn first?',
  'Quiz me on PyTorch',
  'Find free resources for MLOps',
  "How long till I'm job ready?",
  'Explain autograd simply',
]

export default function Chat() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mood, setMood] = useState<Mood>('idle')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatIdRef = useRef<string | null>(searchParams.get('id'))
  const firstName = user?.displayName?.split(' ')[0] || 'there'

  useEffect(() => {
    async function init() {
      if (!user) return

      if (chatIdRef.current) {
        try {
          const msgsRef = collection(db, 'users', user.uid, 'chats', chatIdRef.current, 'messages')
          const q = query(msgsRef, orderBy('timestamp', 'asc'))
          const snap = await getDocs(q)
          const loaded: Message[] = snap.docs.map(d => ({
            id: d.id,
            role: d.data().role,
            text: d.data().text,
            time: d.data().timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
          }))
          setMessages(loaded)
        } catch (e) {
          console.error('Failed to load chat:', e)
        }
      } else {
        const chatRef = await addDoc(
          collection(db, 'users', user.uid, 'chats'),
          { title: 'New chat', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
        )
        chatIdRef.current = chatRef.id

        // Load analysis context for personalised intro
        const analysisResult = JSON.parse(sessionStorage.getItem('analysisResult') || '{}')
        const targetRole = analysisResult.targetRole || 'your target role'
        const gapCount = analysisResult.gapSkills?.length || 0
        const matchScore = analysisResult.matchScore || 0

        const introText = matchScore > 0
          ? `Hey ${firstName}! 👋 I'm Kira — your AI learning guide.\n\nI can see you're targeting **${targetRole}** and you're **${matchScore}% there**. You have **${gapCount} skill gaps** to close. I know exactly what you need to learn and in what order.\n\nAsk me anything — I can make a weekly plan, find resources, quiz you, or explain any concept. What's on your mind?`
          : `Hey ${firstName}! 👋 I'm Kira — your AI learning guide.\n\nI'm here to help you close skill gaps, build your roadmap, and guide you every step of the way. Run an analysis first so I can personalise my advice for you — or just ask me anything to get started!\n\nWhat's on your mind?`

        const msgRef = await addDoc(
          collection(db, 'users', user.uid, 'chats', chatRef.id, 'messages'),
          { role: 'kira', text: introText, timestamp: serverTimestamp() }
        )
        setMessages([{
          id: msgRef.id, role: 'kira', text: introText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }])
      }

      setLoading(false)
    }
    init()
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  async function saveMessage(role: 'kira' | 'user', text: string) {
    if (!user || !chatIdRef.current) return
    const msgRef = await addDoc(
      collection(db, 'users', user.uid, 'chats', chatIdRef.current, 'messages'),
      { role, text, timestamp: serverTimestamp() }
    )
    if (role === 'user' && messages.filter(m => m.role === 'user').length === 0) {
      await setDoc(
        doc(db, 'users', user.uid, 'chats', chatIdRef.current),
        { title: text.slice(0, 60), updatedAt: serverTimestamp() },
        { merge: true }
      )
    }
    return msgRef.id
  }

  async function send(text: string) {
    if (!text.trim() || isTyping) return
    setInput('')

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user', text: text.trim(), time: nowTime(),
    }
    setMessages(prev => [...prev, userMsg])
    await saveMessage('user', text.trim())

    setIsTyping(true)
    setMood('thinking')

    try {
      // Get real analysis context from sessionStorage
      const analysisResult = JSON.parse(sessionStorage.getItem('analysisResult') || '{}')

      const body = {
        message: text.trim(),
        user_context: {
          firstName:     firstName,
          targetRole:    analysisResult.targetRole    || 'ML Engineer',
          matchScore:    analysisResult.matchScore    || 0,
          matchedSkills: analysisResult.matchedSkills || [],
          gapSkills:     analysisResult.gapSkills     || [],
        },
        chat_history: messages.slice(-10).map(m => ({
          role: m.role, text: m.text,
        })),
      }

      const res = await fetch('http://localhost:8000/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`)

      setIsTyping(false)
      setMood('talking')

      // Create empty kira message to stream into
      const kiraId = (Date.now() + 1).toString()
      setMessages(prev => [...prev, {
        id: kiraId, role: 'kira', text: '', time: nowTime(),
      }])

      // Stream tokens
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText   += chunk
        setMessages(prev => prev.map(m =>
          m.id === kiraId ? { ...m, text: fullText } : m
        ))
        // Auto scroll as text streams in
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }

      // Save complete response to Firestore
      await saveMessage('kira', fullText)

      // Set mood based on response content
      const lower = fullText.toLowerCase()
      if (lower.includes('quiz') || lower.includes('question')) {
        setMood('encouraging')
      } else if (lower.includes('great') || lower.includes('amazing') || lower.includes('perfect')) {
        setMood('happy')
      } else {
        setMood('idle')
      }

      setTimeout(() => setMood('idle'), 4000)

    } catch (e: any) {
      console.error('Chat error:', e)
      setIsTyping(false)
      setMood('idle')
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'kira',
        text: "Sorry, I'm having trouble connecting right now 🦊 Make sure the backend is running at localhost:8000 and try again!",
        time: nowTime(),
      }
      setMessages(prev => [...prev, errMsg])
    }
  }

  function formatText(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#a78bfa">$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  const moodDots: Mood[] = ['idle', 'thinking', 'happy', 'talking', 'encouraging']
  const moodDotColors: Record<Mood, string> = {
    idle: '#8b5cf6', thinking: '#22d3ee',
    happy: '#34d399', talking: '#f59e0b', encouraging: '#f87171',
  }

  if (loading) return (
    <div style={{ height: '100vh', background: '#060810', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 14 }}>
      Loading chat...
    </div>
  )

  return (
    <div style={{
      height: '100vh', background: '#060810',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: "'DM Sans', sans-serif",
      color: '#f8fafc', position: 'relative',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.12) 0%,transparent 70%)', top: -150, left: '50%', transform: 'translateX(-50%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>Kira</span>
          <span style={{ fontSize: 12, color: '#4b5563' }}>· your AI learning guide</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/history')}
            style={{ padding: '7px 16px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 100, cursor: 'pointer', fontSize: 12, color: '#a78bfa' }}
          >📁 History</button>
          <button
            onClick={() => navigate('/chat')}
            style={{ padding: '7px 16px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 100, cursor: 'pointer', fontSize: 12, color: '#a78bfa' }}
          >+ New chat</button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: '7px 18px', background: 'transparent', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 100, cursor: 'pointer', fontSize: 12, color: '#64748b' }}
          >← Dashboard</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* LEFT — KIRA */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRight: '1px solid rgba(139,92,246,0.1)' }}>
          <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.15)', animation: 'ringPulse 3s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 330, height: 330, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.08)', animation: 'ringPulse 3s 1.2s ease-in-out infinite' }} />
          <div style={{
            position: 'absolute', width: 250, height: 250, borderRadius: '50%',
            background: `radial-gradient(circle,${
              mood === 'happy' ? 'rgba(52,211,153,0.2)' :
              mood === 'thinking' ? 'rgba(6,182,212,0.15)' :
              mood === 'encouraging' ? 'rgba(239,68,68,0.15)' :
              mood === 'talking' ? 'rgba(245,158,11,0.15)' :
              'rgba(124,58,237,0.18)'
            } 0%,transparent 70%)`,
            filter: 'blur(30px)', transition: 'background 0.8s ease',
          }} />

          <div
            style={{ position: 'relative', zIndex: 2, cursor: 'pointer', animation: moodConfig[mood].animation }}
            onClick={() => {
              const moods: Mood[] = ['idle', 'thinking', 'happy', 'talking', 'encouraging']
              setMood(moods[(moods.indexOf(mood) + 1) % moods.length])
            }}
          >
            <FoxMascot size={200} style={{
              filter: `drop-shadow(0 0 40px rgba(255,140,0,0.5)) drop-shadow(0 0 80px ${
                mood === 'happy' ? 'rgba(52,211,153,0.4)' :
                mood === 'thinking' ? 'rgba(6,182,212,0.4)' :
                'rgba(124,58,237,0.3)'
              })`,
              animation: 'none', transition: 'filter 0.5s ease',
            }} />
          </div>

          <div style={{ marginTop: 20, position: 'relative', zIndex: 3 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 100,
              background: moodConfig[mood].pill.bg,
              border: `1px solid ${moodConfig[mood].pill.border}`,
              color: moodConfig[mood].pill.color,
              fontSize: 12, fontWeight: 600, transition: 'all 0.4s ease',
            }}>
              <span style={{ fontSize: 13 }}>{moodConfig[mood].icon}</span>
              {moodConfig[mood].label}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, position: 'relative', zIndex: 3 }}>
            {moodDots.map(m => (
              <div key={m} onClick={() => setMood(m)} style={{
                width: 10, height: 10, borderRadius: '50%', cursor: 'pointer',
                background: mood === m ? moodDotColors[m] : '#1e293b',
                border: `1px solid ${mood === m ? moodDotColors[m] : '#334155'}`,
                boxShadow: mood === m ? `0 0 8px ${moodDotColors[m]}` : 'none',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#334155', marginTop: 6 }}>click kira or dots to change mood</div>
        </div>

        {/* RIGHT — CHAT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-start', animation: 'fadeSlideUp 0.35s ease both' }}>
                {msg.role === 'kira' && (
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(124,58,237,0.2)', border: '1.5px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🦊</div>
                )}
                <div style={{ maxWidth: msg.role === 'kira' ? '78%' : '68%' }}>
                  <div style={{ fontSize: 11, color: '#374151', marginBottom: 5, fontWeight: 600, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {msg.role === 'kira' ? 'Kira' : 'You'} · {msg.time}
                  </div>
                  <div
                    style={{
                      padding: '13px 16px',
                      borderRadius: msg.role === 'kira' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                      fontSize: 14, lineHeight: 1.75, color: '#f8fafc',
                      background: msg.role === 'kira'
                        ? 'rgba(124,58,237,0.08)'
                        : 'linear-gradient(135deg,rgba(124,58,237,0.22),rgba(6,182,212,0.14))',
                      border: msg.role === 'kira'
                        ? '1px solid rgba(139,92,246,0.2)'
                        : '1px solid rgba(139,92,246,0.3)',
                    }}
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: 'fadeSlideUp 0.3s ease both' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '1.5px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🦊</div>
                <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', animation: `dotBounce 1s ${delay}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div style={{ padding: '0 20px 10px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0 }}>
            {suggestions.map(s => (
              <div
                key={s}
                onClick={() => send(s)}
                style={{ padding: '8px 14px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 20, fontSize: 12, color: '#94a3b8', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)'; (e.currentTarget as HTMLElement).style.color = '#f8fafc' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.15)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
              >{s}</div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(139,92,246,0.1)', background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(8px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, background: 'rgba(15,21,38,0.8)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.2s' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send(input)}
                  placeholder="Ask Kira anything about your learning path..."
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f8fafc', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}
                />
              </div>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isTyping}
                style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: input.trim() && !isTyping ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : 'rgba(139,92,246,0.1)', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: input.trim() ? 'white' : '#4b5563', transition: 'all 0.2s' }}
              >➤</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes foxFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-12px);} }
        @keyframes foxBounce { 0%,100%{transform:translateY(0) scale(1);} 30%{transform:translateY(-20px) scale(1.05);} 60%{transform:translateY(-6px) scale(1.02);} }
        @keyframes foxThink { 0%,100%{transform:rotate(0deg);} 25%{transform:rotate(-5deg);} 75%{transform:rotate(5deg);} }
        @keyframes foxTalk { 0%,100%{transform:scaleY(1);} 50%{transform:scaleY(0.95) translateY(3px);} }
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:0.3;} 50%{transform:scale(1.08);opacity:0.6;} }
        @keyframes dotBounce { 0%,100%{transform:translateY(0);opacity:0.4;} 50%{transform:translateY(-6px);opacity:1;} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
      `}</style>
    </div>
  )
}