import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FoxMascot from '../components/FoxMascot'
import Navbar from '../components/Navbar'

const mockData = {
  targetRole: 'ML Engineer',
  matchScore: 68,
  matchedSkills: 12,
  gapSkills: 9,
  currentModule: { title: 'PyTorch Fundamentals', duration: '3 weeks', type: 'Core' },
  totalModules: 8,
  completedModules: 1,
  pastAnalyses: [
    { role: 'ML Engineer', match: 68, date: '2 days ago', active: true },
    { role: 'Data Scientist', match: 74, date: '1 week ago', active: false },
  ],
  quickAsks: [
    'What should I learn first?',
    'How long till I\'m job ready?',
    'Quiz me on PyTorch',
  ],
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [hasAnalysis] = useState(true) // flip to false to see empty state

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.displayName?.split(' ')[0] || 'there'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      display: 'flex',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 220, background: 'var(--navy2)',
        borderRight: '1px solid var(--border)',
        padding: '28px 0',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 800,
          fontSize: 20, padding: '0 22px 28px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 12,
          cursor: 'pointer',
        }} onClick={() => navigate('/')}>
          Path<span style={{ color: 'var(--cyan)' }}>Forge</span>
        </div>

        {/* Nav items */}
        {[
          { icon: '⬛', label: 'Dashboard', path: '/dashboard', active: true },
          { icon: '🗺', label: 'My Roadmap', path: '/roadmap', active: false },
          { icon: '💬', label: 'Ask Kira', path: '/chat', active: false },
          { icon: '📊', label: 'Skill Profile', path: '/skillgap', active: false },
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
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
            onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

        {[
          { icon: '➕', label: 'New Analysis', path: '/upload' },
          { icon: '📁', label: 'History', path: '/history' },
        ].map(item => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 22px', fontSize: 13, color: '#64748b',
              cursor: 'pointer', transition: 'all 0.2s',
              borderLeft: '2px solid transparent',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748b'}
          >
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}

        {/* User at bottom */}
        <div style={{ flex: 1 }} />
        <div style={{
          padding: '16px 22px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
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

      {/* ── MAIN CONTENT ── */}
      <div style={{
        flex: 1,
        marginLeft: 220,
        padding: '48px 48px 48px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease',
      }}>

        {/* Greeting */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, color: '#4b5563', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
            {greeting()}, {firstName}.
          </div>
        </div>

        {hasAnalysis ? (
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Kira banner */}
              <div style={{
                
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 20,
                padding: '28px 32px',
                display: 'flex', alignItems: 'center', gap: 28,
                background: 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(6,182,212,0.04))',
              }}>
                <FoxMascot size={100} style={{ flexShrink: 0, animation: 'foxFloat 5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--violet-glow)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Kira · your guide
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--white)', marginBottom: 18 }}>
                    You're{' '}
                    <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{mockData.matchScore}% there</span>
                    {' '}for {mockData.targetRole}. Strong foundation — Python, SQL, Data Analysis are solid.
                    The gap? ML frameworks. Let's tackle{' '}
                    <span style={{ color: 'var(--violet-glow)', fontWeight: 700 }}>PyTorch first</span>
                    {' '}— it unlocks everything else.
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => navigate('/roadmap')}
                      style={{
                        background: 'linear-gradient(135deg,var(--violet),var(--cyan))',
                        color: 'white', border: 'none',
                        padding: '10px 22px', borderRadius: 10,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >Continue roadmap →</button>
                    <button
                      onClick={() => navigate('/chat')}
                      style={{
                        background: 'transparent', color: 'var(--muted)',
                        border: '1px solid var(--border)',
                        padding: '10px 20px', borderRadius: 10,
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >Ask Kira anything</button>
                  </div>
                </div>
              </div>

              {/* Two cards row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Where you are */}
                <div style={{
                  background: 'var(--navy2)',
                  border: '1px solid var(--border)',
                  borderRadius: 16, padding: '24px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 16 }}>
                    Where you are
                  </div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                    {mockData.targetRole}
                  </div>
                  <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 20 }}>Current target role</div>

                  {/* Readiness bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--muted)' }}>Readiness</span>
                    <span style={{ color: 'var(--violet-bright)', fontWeight: 700 }}>{mockData.matchScore}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(139,92,246,0.12)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{
                      width: `${mockData.matchScore}%`, height: '100%',
                      background: 'linear-gradient(90deg,var(--violet),var(--cyan))',
                      borderRadius: 4,
                    }} />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      flex: 1, background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 10, padding: '12px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                        {mockData.matchedSkills}
                      </div>
                      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>matched</div>
                    </div>
                    <div style={{
                      flex: 1, background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 10, padding: '12px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#f87171' }}>
                        {mockData.gapSkills}
                      </div>
                      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>gaps</div>
                    </div>
                  </div>
                </div>

                {/* Next up */}
                <div style={{
                  background: 'var(--navy2)',
                  border: '1px solid var(--border)',
                  borderRadius: 16, padding: '24px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 16 }}>
                    Next up
                  </div>

                  <div style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: 12, padding: '16px', marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{mockData.currentModule.title}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 100, background: 'rgba(139,92,246,0.15)',
                        color: 'var(--violet-glow)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        whiteSpace: 'nowrap', marginLeft: 8,
                      }}>{mockData.currentModule.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563' }}>
                      ⏱ {mockData.currentModule.duration} estimated
                    </div>
                  </div>

                  {/* Roadmap bar */}
                  <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8 }}>
                    Roadmap — {mockData.completedModules} of {mockData.totalModules} complete
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: mockData.totalModules }).map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 5, borderRadius: 3,
                        background: i < mockData.completedModules
                          ? '#34d399'
                          : i === mockData.completedModules
                            ? 'var(--violet-bright)'
                            : 'rgba(139,92,246,0.12)',
                      }} />
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/roadmap')}
                    style={{
                      width: '100%', marginTop: 16,
                      background: 'transparent', color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      padding: '9px', borderRadius: 10,
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >View full roadmap →</button>
                </div>
              </div>

              {/* Past analyses */}
              <div style={{
                background: 'var(--navy2)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: '24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase' }}>
                    Past analyses
                  </div>
                  <button
                    onClick={() => navigate('/upload')}
                    style={{ background: 'none', border: 'none', color: 'var(--violet-bright)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}
                  >+ New</button>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {mockData.pastAnalyses.map((a, i) => (
                    <div key={i} style={{
                      flex: 1, padding: '14px 18px',
                      background: a.active ? 'rgba(124,58,237,0.06)' : 'transparent',
                      border: `1px solid ${a.active ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.1)'}`,
                      borderRadius: 12,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: a.active ? 'var(--white)' : 'var(--muted)' }}>
                          {a.role}
                        </div>
                        <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                          {a.active ? 'Active · ' : ''}{a.date}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: "'Syne',sans-serif",
                          fontSize: 18, fontWeight: 800,
                          color: a.active ? 'var(--violet-bright)' : '#34d399',
                        }}>{a.match}%</div>
                        <div style={{ fontSize: 10, color: '#4b5563' }}>match</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN — Quick ask Kira ── */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <div style={{
                background: 'var(--navy2)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: '24px',
                position: 'sticky', top: 48,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#4b5563', textTransform: 'uppercase', marginBottom: 16 }}>
                  Quick ask Kira
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {mockData.quickAsks.map((q, i) => (
                    <div
                      key={i}
                      onClick={() => navigate('/chat')}
                      style={{
                        padding: '11px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(139,92,246,0.12)',
                        borderRadius: 10, fontSize: 13,
                        color: 'var(--muted)', cursor: 'pointer',
                        transition: 'all 0.2s',
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.3)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--white)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.12)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--muted)'
                      }}
                    >
                      "{q}"
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/chat')}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg,var(--violet),var(--cyan))',
                    color: 'white', border: 'none',
                    padding: '12px', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >Open full chat →</button>
              </div>
            </div>
          </div>

        ) : (
          /* ── EMPTY STATE ── */
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', textAlign: 'center',
          }}>
            <FoxMascot size={200} style={{ marginBottom: 32 }} />
            <h2 style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 28, fontWeight: 800,
              letterSpacing: '-0.5px', marginBottom: 12,
            }}>Hey {firstName}, I'm Kira!</h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 400, lineHeight: 1.7, marginBottom: 32 }}>
              I'm your AI learning guide. Upload your resume and a job description and I'll map exactly what you need to learn — and guide you every step of the way.
            </p>
            <button
              onClick={() => navigate('/upload')}
              style={{
                background: 'linear-gradient(135deg,var(--violet),var(--cyan))',
                color: 'white', border: 'none',
                padding: '16px 36px', borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 0 40px rgba(124,58,237,0.4)',
              }}
            >Start your first analysis →</button>
          </div>
        )}
      </div>
    </div>
  )
}