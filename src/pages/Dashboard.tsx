import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FoxMascot from '../components/FoxMascot'
import { db } from '../firebase'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'

const mockData = {
  targetRole: 'ML Engineer',
  matchScore: 68,
  matchedSkills: 12,
  gapSkills: 9,
  currentModule: { title: 'PyTorch Fundamentals', duration: '3 weeks', type: 'Core' },
  totalModules: 8,
  completedModules: 1,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [hasAnalysis] = useState(true)
  const [foxHovered, setFoxHovered] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [analysisHistory, setAnalysisHistory] = useState<{ role: string; match: number; date: string; active: boolean }[]>([])
  const [chatHistory, setChatHistory] = useState<{ id: string; title: string }[]>([])

  const firstName = user?.displayName?.split(' ')[0] || 'there'

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  useEffect(() => {
    async function loadHistory() {
      if (!user) return
      try {
        // Load chats
        const chatQ = query(
          collection(db, 'users', user.uid, 'chats'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const chatSnap = await getDocs(chatQ)
        setChatHistory(chatSnap.docs.map(d => ({
          id: d.id,
          title: d.data().title || 'Untitled chat',
        })))

        // Load analyses
        const analysisQ = query(
          collection(db, 'users', user.uid, 'analyses'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const analysisSnap = await getDocs(analysisQ)
        if (analysisSnap.docs.length > 0) {
          setAnalysisHistory(analysisSnap.docs.map(d => ({
            role: d.data().targetRole || 'Unknown role',
            match: d.data().matchScore || 0,
            date: d.data().createdAt?.toDate?.()?.toLocaleDateString() || '',
            active: false,
          })))
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadHistory()
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 220, background: 'var(--navy2)',
        borderRight: '1px solid var(--border)',
        padding: '28px 0',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50, overflowY: 'auto',
      }}>
        <div
          style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, padding: '0 22px 28px', borderBottom: '1px solid var(--border)', marginBottom: 12, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/')}
        >
          Path<span style={{ color: 'var(--cyan)' }}>Forge</span>
        </div>

        {/* Main nav */}
        {[
          { icon: '⬛', label: 'Dashboard', path: '/dashboard', active: true },
          { icon: '🗺', label: 'My Roadmap', path: '/roadmap', active: false },
          { icon: '📊', label: 'Skill Profile', path: '/skillgap', active: false },
          { icon: '💬', label: 'Ask Kira', path: '/chat', active: false },
        ].map(item => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 22px', fontSize: 13,
              color: item.active ? 'var(--white)' : '#64748b',
              borderLeft: `2px solid ${item.active ? 'var(--violet-bright)' : 'transparent'}`,
              background: item.active ? 'rgba(124,58,237,0.08)' : 'transparent',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
            onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

        {/* New Analysis */}
        <div
          onClick={() => navigate('/upload')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 22px', fontSize: 13, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', borderLeft: '2px solid transparent' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748b'}
        >
          <span style={{ fontSize: 15 }}>➕</span> New Analysis
        </div>

        {/* Analysis History folder */}
        <div>
          <div
            onClick={() => setAnalysisOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 22px', fontSize: 12, color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#64748b'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>📁</span>
              <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>Analyses</span>
            </div>
            <span style={{ fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: analysisOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          </div>
          {analysisOpen && (
            <div style={{ paddingBottom: 4 }}>
              {analysisHistory.length === 0 ? (
                <div style={{ padding: '6px 22px 6px 40px', fontSize: 11, color: '#374151' }}>No analyses yet</div>
              ) : (
                analysisHistory.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => navigate('/skillgap')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px 7px 38px', fontSize: 12, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f8fafc'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.role}</span>
                    <span style={{ fontSize: 10, color: 'var(--violet-bright)', marginLeft: 6, flexShrink: 0 }}>{a.match}%</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chat History folder */}
        <div>
          <div
            onClick={() => setChatOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 22px', fontSize: 12, color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#64748b'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#4b5563'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>💬</span>
              <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>Chats</span>
            </div>
            <span style={{ fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: chatOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          </div>
          {chatOpen && (
            <div style={{ paddingBottom: 4 }}>
              {chatHistory.length === 0 ? (
                <div style={{ padding: '6px 22px 6px 40px', fontSize: 11, color: '#374151' }}>No chats yet</div>
              ) : (
                chatHistory.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/chat?id=${chat.id}`)}
                    style={{ display: 'flex', alignItems: 'center', padding: '7px 16px 7px 38px', fontSize: 12, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s', gap: 8 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f8fafc'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 11 }}>🦊</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</span>
                  </div>
                ))
              )}
              <div
                onClick={() => navigate('/history')}
                style={{ padding: '6px 16px 6px 38px', fontSize: 11, color: 'var(--violet-bright)', cursor: 'pointer', fontWeight: 600 }}
              >See all →</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* User */}
        <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--violet-bright)' }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--violet),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {firstName[0]}
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{firstName}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{mockData.targetRole}</div>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{
        flex: 1, marginLeft: 220,
        padding: '48px 40px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease',
      }}>

        {/* Greeting */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: '#4b5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            {greeting()}, {firstName}.
          </div>
        </div>

        {hasAnalysis ? (
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── KIRA — BIG, CENTER, CLICKABLE ── */}
              <div
                onClick={() => navigate('/chat')}
                onMouseEnter={() => setFoxHovered(true)}
                onMouseLeave={() => setFoxHovered(false)}
                style={{
                  background: 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(6,182,212,0.04))',
                  border: `1px solid ${foxHovered ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.22)'}`,
                  borderRadius: 24,
                  padding: '44px 40px 36px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  transform: foxHovered ? 'translateY(-3px)' : 'translateY(0)',
                  transition: 'all 0.3s ease',
                  boxShadow: foxHovered ? '0 20px 60px rgba(124,58,237,0.15)' : 'none',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.14) 0%, transparent 65%)' }} />

                {/* Orbit ring */}
                <div style={{
                  position: 'absolute', width: 380, height: 380, borderRadius: '50%',
                  border: '1px solid rgba(139,92,246,0.1)',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'spinSlow 20s linear infinite',
                  pointerEvents: 'none',
                }}>
                  <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: 'var(--violet-bright)', boxShadow: '0 0 10px var(--violet-bright)' }} />
                </div>

                {/* Fox */}
                <FoxMascot
                  size={260}
                  style={{
                    position: 'relative', zIndex: 2,
                    transform: foxHovered ? 'translateY(-6px) scale(1.03)' : 'translateY(0) scale(1)',
                    transition: 'transform 0.4s ease',
                    filter: foxHovered
                      ? 'drop-shadow(0 0 50px rgba(255,140,0,0.6)) drop-shadow(0 0 90px rgba(124,58,237,0.4))'
                      : 'drop-shadow(0 6px 40px rgba(255,140,0,0.45)) drop-shadow(0 0 60px rgba(124,58,237,0.25))',
                    animation: 'foxFloat 5s ease-in-out infinite',
                  }}
                />

                {/* Speech bubble */}
                <div style={{
                  position: 'relative', zIndex: 2, marginTop: 24,
                  background: 'rgba(10,14,26,0.92)',
                  border: `1px solid ${foxHovered ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`,
                  borderRadius: 16, padding: '18px 28px', maxWidth: 500,
                  textAlign: 'center', backdropFilter: 'blur(8px)', transition: 'border-color 0.3s',
                }}>
                  {/* Bubble tail */}
                  <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `9px solid ${foxHovered ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}` }} />
                  <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid rgba(10,14,26,0.92)' }} />

                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--violet-glow)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Kira · your guide
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--white)' }}>
                    Hey {firstName}! I'm{' '}
                    <span style={{ color: 'var(--violet-glow)', fontWeight: 700 }}>Kira</span>
                    {' '}— your AI learning guide. 🦊
                    <br /><br />
                    I analyze your skills, build your personalized roadmap, and stay with you every step of the way. Ask me anything — from{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>finding resources</span>
                    {' '}to{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>quizzing you</span>
                    {' '}to building your{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>weekly study plan</span>.
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: foxHovered ? '#a78bfa' : '#4b5563', transition: 'color 0.3s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 6px #34d399' }} />
                    {foxHovered ? 'Opening chat...' : 'Tap to chat with Kira'}
                  </div>
                </div>
              </div>

              {/* Where you are + Next up */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                {/* Where you are */}
                <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 14 }}>Where you are</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{mockData.targetRole}</div>
                  <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 16 }}>Current target role</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: 'var(--muted)' }}>Readiness</span>
                    <span style={{ color: 'var(--violet-bright)', fontWeight: 700 }}>{mockData.matchScore}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(139,92,246,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ width: `${mockData.matchScore}%`, height: '100%', background: 'linear-gradient(90deg,var(--violet),var(--cyan))', borderRadius: 3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#34d399' }}>{mockData.matchedSkills}</div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>matched</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#f87171' }}>{mockData.gapSkills}</div>
                      <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>gaps</div>
                    </div>
                  </div>
                </div>

                {/* Next up */}
                <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 14 }}>Next up</div>
                  <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 11, padding: '14px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{mockData.currentModule.title}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'rgba(139,92,246,0.15)', color: 'var(--violet-glow)', border: '1px solid rgba(139,92,246,0.3)', whiteSpace: 'nowrap', marginLeft: 8 }}>{mockData.currentModule.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>⏱ {mockData.currentModule.duration}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 7 }}>
                    {mockData.completedModules} of {mockData.totalModules} modules
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {Array.from({ length: mockData.totalModules }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < mockData.completedModules ? '#34d399' : i === mockData.completedModules ? 'var(--violet-bright)' : 'rgba(139,92,246,0.1)' }} />
                    ))}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); navigate('/roadmap') }}
                    style={{ width: '100%', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '8px', borderRadius: 9, fontSize: 12, cursor: 'pointer' }}
                  >View full roadmap →</button>
                </div>
              </div>

              {/* Past analyses from Firestore */}
              {analysisHistory.length > 0 && (
                <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase' }}>Past analyses</div>
                    <button onClick={() => navigate('/upload')} style={{ background: 'none', border: 'none', color: 'var(--violet-bright)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>+ New</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {analysisHistory.slice(0, 2).map((a, i) => (
                      <div key={i} style={{ flex: 1, padding: '12px 14px', background: i === 0 ? 'rgba(124,58,237,0.06)' : 'transparent', border: `1px solid ${i === 0 ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.1)'}`, borderRadius: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? 'var(--white)' : 'var(--muted)' }}>{a.role}</div>
                          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{a.date}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: i === 0 ? 'var(--violet-bright)' : '#34d399' }}>{a.match}%</div>
                          <div style={{ fontSize: 10, color: '#4b5563' }}>match</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT — Quick asks ── */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px', position: 'sticky', top: 48 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 14 }}>
                  Quick ask Kira
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {[
                    'What should I learn first?',
                    'Make me a weekly plan',
                    "How long till I'm job ready?",
                    'Quiz me on PyTorch',
                  ].map(q => (
                    <div
                      key={q}
                      onClick={() => navigate('/chat')}
                      style={{ padding: '10px 13px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: 9, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'; (e.currentTarget as HTMLElement).style.color = 'var(--white)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                    >
                      "{q}"
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/chat')}
                  style={{ width: '100%', background: 'linear-gradient(135deg,var(--violet),var(--cyan))', color: 'white', border: 'none', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >Open full chat →</button>
              </div>
            </div>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
            <FoxMascot size={260} style={{ marginBottom: 28, animation: 'foxFloat 5s ease-in-out infinite' }} />
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10 }}>
              Hey {firstName}, I'm Kira!
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 380, lineHeight: 1.7, marginBottom: 28 }}>
              I'm your AI learning guide. Upload your resume and a job description — I'll map exactly what you need to learn and guide you every step of the way.
            </p>
            <button
              onClick={() => navigate('/upload')}
              style={{ background: 'linear-gradient(135deg,var(--violet),var(--cyan))', color: 'white', border: 'none', padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}
            >Start your first analysis →</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes foxFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-12px);} }
        @keyframes spinSlow { to{transform:translate(-50%,-50%) rotate(360deg);} }
      `}</style>
    </div>
  )
}