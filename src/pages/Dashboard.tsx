import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FoxMascot from '../components/FoxMascot'
import { db } from '../firebase'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'

interface AnalysisData {
  targetRole: string
  matchScore: number
  matchedSkills: any[]
  gapSkills: any[]
  roadmapNodes: any[]
  candidateName: string
  createdAt: any
}

interface ChatItem { id: string; title: string }
interface AnalysisItem { id: string; role: string; match: number; date: string }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [foxHovered, setFoxHovered] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([])
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisItem[]>([])
  const [latest, setLatest] = useState<AnalysisData | null>(null)
  const [hasAnalysis, setHasAnalysis] = useState(false)

  const firstName = user?.displayName?.split(' ')[0] || 'there'

  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  useEffect(() => {
    async function loadHistory() {
      if (!user) return
      try {
        const chatQ    = query(collection(db, 'users', user.uid, 'chats'), orderBy('createdAt', 'desc'), limit(5))
        const chatSnap = await getDocs(chatQ)
        setChatHistory(chatSnap.docs.map(d => ({ id: d.id, title: d.data().title || 'Untitled chat' })))

        const analysisQ    = query(collection(db, 'users', user.uid, 'analyses'), orderBy('createdAt', 'desc'), limit(5))
        const analysisSnap = await getDocs(analysisQ)

        if (analysisSnap.docs.length > 0) {
          setHasAnalysis(true)
          setAnalysisHistory(analysisSnap.docs.map(d => ({
            id:    d.id,
            role:  d.data().targetRole || 'Unknown',
            match: d.data().matchScore || 0,
            date:  d.data().createdAt?.toDate?.()?.toLocaleDateString() || '',
          })))

          const data = analysisSnap.docs[0].data()
          const latestData: AnalysisData = {
            targetRole:    data.targetRole    || '',
            matchScore:    data.matchScore    || 0,
            candidateName: data.candidateName || '',
            matchedSkills: data.matchedSkills || [],
            gapSkills:     data.gapSkills     || [],
            roadmapNodes:  data.roadmapNodes  || [],
            createdAt:     data.createdAt,
          }
          setLatest(latestData)

          // Push latest analysis back to sessionStorage so roadmap + skillgap pages work
          sessionStorage.setItem('analysisResult', JSON.stringify({
            targetRole:    latestData.targetRole,
            matchScore:    latestData.matchScore,
            candidateName: latestData.candidateName,
            matchedSkills: latestData.matchedSkills,
            gapSkills:     latestData.gapSkills,
          }))
          if (latestData.roadmapNodes?.length) {
            sessionStorage.setItem('roadmapNodes', JSON.stringify(latestData.roadmapNodes))
          }
        }
      } catch (e) { console.error(e) }
    }
    loadHistory()
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function getMiniPathPoint(t: number, w: number, h: number) {
    const pts = [
      { x: w * 0.05, y: h * 0.85 },
      { x: w * 0.25, y: h * 0.65 },
      { x: w * 0.45, y: h * 0.50 },
      { x: w * 0.65, y: h * 0.38 },
      { x: w * 0.85, y: h * 0.25 },
      { x: w * 0.95, y: h * 0.15 },
    ]
    const seg = t * (pts.length - 1)
    const i   = Math.min(Math.floor(seg), pts.length - 2)
    const f   = seg - i
    const p0  = pts[Math.max(0, i-1)], p1 = pts[i], p2 = pts[i+1]
    const p3  = pts[Math.min(pts.length-1, i+2)]
    return {
      x: 0.5*(2*p1.x+(-p0.x+p2.x)*f+(2*p0.x-5*p1.x+4*p2.x-p3.x)*f*f+(-p0.x+3*p1.x-3*p2.x+p3.x)*f*f*f),
      y: 0.5*(2*p1.y+(-p0.y+p2.y)*f+(2*p0.y-5*p1.y+4*p2.y-p3.y)*f*f+(-p0.y+3*p1.y-3*p2.y+p3.y)*f*f*f),
    }
  }

  const currentNode      = latest?.roadmapNodes?.find((n: any) => n.status === 'active' || n.status === 'available') || latest?.roadmapNodes?.[0]
  const completedNodes   = latest?.roadmapNodes?.filter((n: any) => n.status === 'completed').length || 0
  const totalNodes       = latest?.roadmapNodes?.length || 0
  const highPriorityGaps = latest?.gapSkills?.filter((s: any) => s.priority === 'high') || []
  const topMatched       = latest?.matchedSkills?.slice(0, 5) || []

  const navItems = [
    { icon: '⬛', label: 'Dashboard',    path: '/dashboard', active: true  },
    { icon: '🗺', label: 'My Roadmap',   path: '/roadmap',   active: false },
    { icon: '📊', label: 'Skill Profile', path: '/skillgap',  active: false },
    { icon: '💬', label: 'Ask Kira',      path: '/chat',      active: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <div style={{ width: 220, background: 'var(--navy2)', borderRight: '1px solid var(--border)', padding: '28px 0', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, padding: '0 22px 28px', borderBottom: '1px solid var(--border)', marginBottom: 12, cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/')}>
          Path<span style={{ color: 'var(--cyan)' }}>Forge</span>
        </div>

        {navItems.map(item => (
          <div key={item.label} onClick={() => navigate(item.path)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 22px', fontSize: 13, color: item.active ? 'var(--white)' : '#64748b', borderLeft: `2px solid ${item.active ? 'var(--violet-bright)' : 'transparent'}`, background: item.active ? 'rgba(124,58,237,0.08)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
            onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

        <div onClick={() => navigate('/upload')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 22px', fontSize: 13, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', borderLeft: '2px solid transparent' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748b'}
        >
          <span style={{ fontSize: 15 }}>➕</span> New Analysis
        </div>

        {/* Analyses folder */}
        <div>
          <div onClick={() => setAnalysisOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 22px', fontSize: 12, color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>📁</span>
              <span style={{ fontWeight: 600 }}>Analyses</span>
            </div>
            <span style={{ fontSize: 10, display: 'inline-block', transform: analysisOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
          </div>
          {analysisOpen && (
            <div style={{ paddingBottom: 4 }}>
              {analysisHistory.length === 0
                ? <div style={{ padding: '6px 22px 6px 40px', fontSize: 11, color: '#374151' }}>No analyses yet</div>
                : analysisHistory.map((a, i) => (
                  <div key={a.id} onClick={() => navigate('/skillgap')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px 7px 38px', fontSize: 12, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f8fafc'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.role}</span>
                    <span style={{ fontSize: 10, color: i === 0 ? 'var(--violet-bright)' : '#34d399', marginLeft: 6, flexShrink: 0 }}>{a.match}%</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Chats folder */}
        <div>
          <div onClick={() => setChatOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 22px', fontSize: 12, color: '#4b5563', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13 }}>💬</span>
              <span style={{ fontWeight: 600 }}>Chats</span>
            </div>
            <span style={{ fontSize: 10, display: 'inline-block', transform: chatOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
          </div>
          {chatOpen && (
            <div style={{ paddingBottom: 4 }}>
              {chatHistory.length === 0
                ? <div style={{ padding: '6px 22px 6px 40px', fontSize: 11, color: '#374151' }}>No chats yet</div>
                : chatHistory.map(chat => (
                  <div key={chat.id} onClick={() => navigate(`/chat?id=${chat.id}`)}
                    style={{ display: 'flex', alignItems: 'center', padding: '7px 16px 7px 38px', fontSize: 12, color: '#64748b', cursor: 'pointer', transition: 'all 0.15s', gap: 8 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f8fafc'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 11 }}>🦊</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</span>
                  </div>
                ))
              }
              <div onClick={() => navigate('/history')} style={{ padding: '6px 16px 6px 38px', fontSize: 11, color: 'var(--violet-bright)', cursor: 'pointer', fontWeight: 600 }}>See all →</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--violet-bright)' }} />
            : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--violet),var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{firstName[0]}</div>
          }
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{firstName}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{latest?.targetRole || 'No analysis yet'}</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, marginLeft: 220, padding: '48px 40px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease' }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: '#4b5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
            {greeting()}, {firstName}.
          </div>
        </div>

        {hasAnalysis && latest ? (
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* KIRA CARD */}
              <div
                onClick={() => navigate('/chat')}
                onMouseEnter={() => setFoxHovered(true)}
                onMouseLeave={() => setFoxHovered(false)}
                style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(6,182,212,0.04))', border: `1px solid ${foxHovered ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.22)'}`, borderRadius: 24, padding: '44px 40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', transform: foxHovered ? 'translateY(-3px)' : 'translateY(0)', transition: 'all 0.3s ease', boxShadow: foxHovered ? '0 20px 60px rgba(124,58,237,0.15)' : 'none' }}
              >
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.14) 0%, transparent 65%)' }} />
                <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', border: '1px solid rgba(139,92,246,0.1)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'spinSlow 20s linear infinite', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: 'var(--violet-bright)', boxShadow: '0 0 10px var(--violet-bright)' }} />
                </div>
                <FoxMascot size={220} style={{ position: 'relative', zIndex: 2, transform: foxHovered ? 'translateY(-6px) scale(1.03)' : 'translateY(0) scale(1)', transition: 'transform 0.4s ease', filter: foxHovered ? 'drop-shadow(0 0 50px rgba(255,140,0,0.6)) drop-shadow(0 0 90px rgba(124,58,237,0.4))' : 'drop-shadow(0 6px 40px rgba(255,140,0,0.45)) drop-shadow(0 0 60px rgba(124,58,237,0.25))', animation: 'foxFloat 5s ease-in-out infinite' }} />
                <div style={{ position: 'relative', zIndex: 2, marginTop: 24, background: 'rgba(10,14,26,0.92)', border: `1px solid ${foxHovered ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}`, borderRadius: 16, padding: '18px 28px', maxWidth: 500, textAlign: 'center', backdropFilter: 'blur(8px)', transition: 'border-color 0.3s' }}>
                  <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `9px solid ${foxHovered ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.2)'}` }} />
                  <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid rgba(10,14,26,0.92)' }} />
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--violet-glow)', textTransform: 'uppercase', marginBottom: 10 }}>Kira · your guide</div>
                  <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--white)' }}>
                    Hey {firstName}! I'm <span style={{ color: 'var(--violet-glow)', fontWeight: 700 }}>Kira</span> — your AI learning guide. 🦊
                    <br /><br />
                    I analyze your skills, build your personalized roadmap, and stay with you every step of the way. Ask me anything — from{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>finding resources</span>{' '}to{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>quizzing you</span>{' '}to building your{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>weekly study plan</span>.
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: foxHovered ? '#a78bfa' : '#4b5563', transition: 'color 0.3s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 6px #34d399' }} />
                    {foxHovered ? 'Opening chat...' : 'Tap to chat with Kira'}
                  </div>
                </div>
              </div>

              {/* TWO CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

                {/* SKILL OVERVIEW */}
                <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 16 }}>Skill Overview</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0, background: `conic-gradient(var(--violet-bright) ${latest.matchScore * 3.6}deg, rgba(139,92,246,0.1) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--navy2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--white)', lineHeight: 1 }}>{latest.matchScore}%</span>
                        <span style={{ fontSize: 8, color: '#4b5563', marginTop: 1 }}>match</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#34d399' }}>{latest.matchedSkills.length}</div>
                          <div style={{ fontSize: 10, color: '#4b5563' }}>matched</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#f87171' }}>{latest.gapSkills.length}</div>
                          <div style={{ fontSize: 10, color: '#4b5563' }}>gaps</div>
                        </div>
                      </div>
                      <div style={{ height: 5, background: 'rgba(139,92,246,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${latest.matchScore}%`, height: '100%', background: 'linear-gradient(90deg,var(--violet),var(--cyan))', borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                  {highPriorityGaps.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>🔴 High priority gaps</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {highPriorityGaps.slice(0, 4).map((s: any) => (
                          <span key={s.name} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>{s.name}</span>
                        ))}
                        {highPriorityGaps.length > 4 && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, color: '#4b5563' }}>+{highPriorityGaps.length - 4} more</span>}
                      </div>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); navigate('/skillgap') }} style={{ width: '100%', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '8px', borderRadius: 9, fontSize: 12, cursor: 'pointer' }}>
                    View full skill profile →
                  </button>
                </div>

                {/* ROADMAP CARD */}
                <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 14 }}>Learning Roadmap</div>

                  {/* Mini winding path */}
                  <div onClick={e => { e.stopPropagation(); navigate('/roadmap') }}
                    style={{ background: 'rgba(124,58,237,0.04)', borderRadius: 10, padding: '8px', marginBottom: 14, border: '1px solid rgba(139,92,246,0.1)', cursor: 'pointer' }}>
                    <svg width="100%" viewBox="0 0 200 70" style={{ display: 'block' }}>
                      <path d={`M ${[0,0.2,0.4,0.6,0.8,1].map(t => { const p = getMiniPathPoint(t,200,70); return `${p.x},${p.y}` }).join(' L ')}`} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="10" strokeLinecap="round" />
                      <path d={`M ${[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1].map(t => { const p = getMiniPathPoint(t,200,70); return `${p.x},${p.y}` }).join(' L ')}`} fill="none" stroke="#0d1020" strokeWidth="7" strokeLinecap="round" />
                      {totalNodes > 0 && completedNodes > 0 && (() => {
                        const endT = completedNodes / totalNodes * 0.9
                        const pts  = [0,0.15,0.3,0.45,0.6,0.75,0.9].filter(t => t <= endT)
                        if (pts.length < 2) return null
                        return <path d={`M ${pts.map(t => { const p = getMiniPathPoint(t,200,70); return `${p.x},${p.y}` }).join(' L ')}`} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                      })()}
                      {(() => {
                        const startT = totalNodes > 0 ? completedNodes / totalNodes * 0.9 : 0.3
                        const endT   = totalNodes > 0 ? Math.min((completedNodes+1)/totalNodes*0.9,1) : 0.5
                        const p1 = getMiniPathPoint(startT,200,70), p2 = getMiniPathPoint(endT,200,70)
                        return <path d={`M ${p1.x},${p1.y} L ${p2.x},${p2.y}`} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
                      })()}
                      {(() => { const p = getMiniPathPoint(0,200,70); return <circle cx={p.x} cy={p.y} r="4" fill="#10b981" /> })()}
                      {(() => {
                        const t = totalNodes > 0 ? completedNodes/totalNodes*0.9 : 0.35
                        const p = getMiniPathPoint(t,200,70)
                        return <g><circle cx={p.x} cy={p.y} r="7" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5" /><circle cx={p.x} cy={p.y} r="3" fill="#8b5cf6" /></g>
                      })()}
                      {(() => {
                        const p = getMiniPathPoint(1,200,70)
                        return <g><circle cx={p.x} cy={p.y} r="6" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5" /><text x={p.x} y={p.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="7">🎯</text></g>
                      })()}
                    </svg>
                  </div>

                  <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 8 }}>
                    {completedNodes} of {totalNodes || latest.gapSkills.length} modules complete
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {Array.from({ length: Math.min(totalNodes || latest.gapSkills.length, 10) }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < completedNodes ? '#34d399' : i === completedNodes ? 'var(--violet-bright)' : 'rgba(139,92,246,0.1)' }} />
                    ))}
                  </div>

                  {currentNode && (
                    <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>Next up</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 3 }}>{currentNode.skill || currentNode.title}</div>
                      <div style={{ fontSize: 10, color: '#4b5563' }}>⏱ {currentNode.duration_weeks || currentNode.duration || '?'} {typeof currentNode.duration_weeks === 'number' ? 'weeks' : ''}</div>
                    </div>
                  )}

                  <button onClick={e => { e.stopPropagation(); navigate('/roadmap') }} style={{ width: '100%', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '8px', borderRadius: 9, fontSize: 12, cursor: 'pointer' }}>
                    View full roadmap →
                  </button>
                </div>
              </div>

              {/* Past analyses */}
              {analysisHistory.length > 0 && (
                <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase' }}>Past analyses</div>
                    <button onClick={e => { e.stopPropagation(); navigate('/upload') }} style={{ background: 'none', border: 'none', color: 'var(--violet-bright)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>+ New</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {analysisHistory.slice(0, 2).map((a, i) => (
                      <div key={a.id} onClick={e => { e.stopPropagation(); navigate('/skillgap') }}
                        style={{ flex: 1, padding: '12px 14px', background: i === 0 ? 'rgba(124,58,237,0.06)' : 'transparent', border: `1px solid ${i === 0 ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.1)'}`, borderRadius: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? 'var(--white)' : 'var(--muted)' }}>{a.role}</div>
                          <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>{i === 0 ? 'Latest · ' : ''}{a.date}</div>
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

            {/* RIGHT — Quick asks */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px', position: 'sticky', top: 48 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 14 }}>Quick ask Kira</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {[
                    `What should I learn first for ${latest.targetRole}?`,
                    'Make me a weekly study plan',
                    "How long till I'm job ready?",
                    `Quiz me on ${latest.gapSkills?.[0]?.name || 'my top gap skill'}`,
                  ].map(q => (
                    <div key={q} onClick={() => navigate('/chat')}
                      style={{ padding: '10px 13px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: 9, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1.4, transition: 'all 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'; (e.currentTarget as HTMLElement).style.color = 'var(--white)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                    >"{q}"</div>
                  ))}
                </div>
                {topMatched.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>✅ Your strengths</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {topMatched.map((s: any) => (
                        <span key={s.name} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => navigate('/chat')} style={{ width: '100%', background: 'linear-gradient(135deg,var(--violet),var(--cyan))', color: 'white', border: 'none', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Open full chat →
                </button>
              </div>
            </div>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
            <FoxMascot size={220} style={{ marginBottom: 28, animation: 'foxFloat 5s ease-in-out infinite' }} />
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 10 }}>Hey {firstName}, I'm Kira!</h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 380, lineHeight: 1.7, marginBottom: 28 }}>
              I'm your AI learning guide. Upload your resume and a job description — I'll map exactly what you need to learn and guide you every step of the way.
            </p>
            <button onClick={() => navigate('/upload')} style={{ background: 'linear-gradient(135deg,var(--violet),var(--cyan))', color: 'white', border: 'none', padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
              Start your first analysis →
            </button>
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