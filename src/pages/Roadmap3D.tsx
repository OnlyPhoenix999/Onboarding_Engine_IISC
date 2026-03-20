import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FoxMascot from '../components/FoxMascot'

interface RoadmapNode {
  id: string
  title: string
  subtitle: string
  duration: string
  status: 'done' | 'active' | 'locked'
  t: number
}

const NODES: RoadmapNode[] = [
  { id: 'n1', title: 'Python for ML', subtitle: 'Foundations', duration: '2 wks', status: 'done', t: 0.0 },
  { id: 'n2', title: 'Feature Eng.', subtitle: 'Data prep', duration: '2 wks', status: 'done', t: 0.28 },
  { id: 'n3', title: 'PyTorch', subtitle: 'Deep learning', duration: '3 wks', status: 'active', t: 0.52 },
  { id: 'n4', title: 'MLOps', subtitle: 'Pipelines', duration: '2 wks', status: 'locked', t: 0.72 },
  { id: 'n5', title: 'Model Deploy', subtitle: 'FastAPI + Cloud', duration: '2 wks', status: 'locked', t: 0.88 },
]

// Path spans a large virtual canvas — 2400 x 1400
const VW = 2400
const VH = 1400

function getPathPoint(t: number) {
  const pts = [
    { x: VW * 0.92, y: VH * 0.82 },
    { x: VW * 0.78, y: VH * 0.68 },
    { x: VW * 0.64, y: VH * 0.56 },
    { x: VW * 0.50, y: VH * 0.44 },
    { x: VW * 0.36, y: VH * 0.34 },
    { x: VW * 0.22, y: VH * 0.26 },
    { x: VW * 0.10, y: VH * 0.18 },
  ]
  const seg = t * (pts.length - 1)
  const i = Math.min(Math.floor(seg), pts.length - 2)
  const f = seg - i
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * f + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f * f + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * f * f * f),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * f + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f * f + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * f * f * f),
  }
}

const statusColors = {
  done: { border: '#34d399', bg: 'rgba(16,185,129,0.15)', glow: 'rgba(52,211,153,0.4)', text: '#34d399', ring: 'rgba(52,211,153,0.5)' },
  active: { border: '#8b5cf6', bg: 'rgba(124,58,237,0.22)', glow: 'rgba(124,58,237,0.55)', text: '#c4b5fd', ring: 'rgba(139,92,246,0.6)' },
  locked: { border: 'rgba(139,92,246,0.18)', bg: 'rgba(15,21,38,0.9)', glow: 'transparent', text: '#374151', ring: 'transparent' },
}

export default function Roadmap3D() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)
  const [pinned, setPinned] = useState(false)

  // Pan offset — how much we've shifted the virtual canvas
  const panX = useRef(VW * 0.92 - window.innerWidth * 0.85)
  const panY = useRef(VH * 0.82 - window.innerHeight * 0.78)
  const targetPanX = useRef(panX.current)
  const targetPanY = useRef(panY.current)
  const [pan, setPan] = useState({ x: panX.current, y: panY.current })
  const animRef = useRef<number>(0)
  const scrollProgress = useRef(0)

  // Draw road on canvas
  const drawRoad = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = VW
    canvas.height = VH
    ctx.clearRect(0, 0, VW, VH)

    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= 300; i++) pts.push(getPathPoint(i / 300))

    const draw = (w: number, color: string, blur = false) => {
      if (blur) { ctx.filter = `blur(${w / 2}px)` }
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = color
      ctx.lineWidth = w
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      if (blur) ctx.filter = 'none'
    }

    // Shadow
    draw(42, 'rgba(0,0,0,0.85)')
    // Asphalt
    draw(30, '#0b0f1e')
    // Border glow
    draw(34, 'rgba(139,92,246,0.18)')

    // Completed — green glow
    const doneIdx = Math.floor(NODES[2].t * 300)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i <= doneIdx; i++) ctx.lineTo(pts[i].x, pts[i].y)
    const gDone = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[doneIdx].x, pts[doneIdx].y)
    gDone.addColorStop(0, '#34d399')
    gDone.addColorStop(1, '#8b5cf6')
    ctx.strokeStyle = gDone
    ctx.lineWidth = 6
    ctx.stroke()
    ctx.filter = 'blur(8px)'
    ctx.globalAlpha = 0.5
    ctx.stroke()
    ctx.restore()

    // Active — violet
    const activeIdx = Math.floor(NODES[3].t * 300)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[doneIdx].x, pts[doneIdx].y)
    for (let i = doneIdx; i <= activeIdx; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 6
    ctx.stroke()
    ctx.filter = 'blur(10px)'
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 14
    ctx.stroke()
    ctx.restore()

    // Locked — faint
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[activeIdx].x, pts[activeIdx].y)
    for (let i = activeIdx; i <= 300; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = 'rgba(139,92,246,0.12)'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.restore()

    // Ground shadow ellipses
    NODES.forEach(n => {
      const p = getPathPoint(n.t)
      const c = statusColors[n.status]
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + 48, 36, 10, 0, 0, Math.PI * 2)
      ctx.fillStyle = c.glow.replace('0.4', '0.12').replace('0.55', '0.12').replace('0.5', '0.1')
      ctx.filter = 'blur(6px)'
      ctx.fill()
      ctx.restore()
    })

    // Destination shadow
    const dest = getPathPoint(1)
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(dest.x, dest.y + 55, 50, 14, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(245,158,11,0.15)'
    ctx.filter = 'blur(8px)'
    ctx.fill()
    ctx.restore()

  }, [])

  useEffect(() => { drawRoad() }, [drawRoad])

  // Smooth animation loop
  useEffect(() => {
    const loop = () => {
      const dx = targetPanX.current - panX.current
      const dy = targetPanY.current - panY.current
      if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
        panX.current += dx * 0.07
        panY.current += dy * 0.07
        setPan({ x: panX.current, y: panY.current })
      }
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Scroll — move along path direction (bottom-right → top-left)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // scroll progress 0→1
      scrollProgress.current = Math.max(0, Math.min(1, scrollProgress.current + e.deltaY / 1800))
      const p = scrollProgress.current

      // Pan follows the path — camera centers on current path position
      const pt = getPathPoint(p)
      const vw = window.innerWidth
      const vh = window.innerHeight
      targetPanX.current = pt.x - vw * 0.6
      targetPanY.current = pt.y - vh * 0.6
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Touch scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let lastY = 0
    const onTouchStart = (e: TouchEvent) => { lastY = e.touches[0].clientY }
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const dy = lastY - e.touches[0].clientY
      lastY = e.touches[0].clientY
      scrollProgress.current = Math.max(0, Math.min(1, scrollProgress.current + dy / 900))
      const pt = getPathPoint(scrollProgress.current)
      const vw = window.innerWidth
      const vh = window.innerHeight
      targetPanX.current = pt.x - vw * 0.6
      targetPanY.current = pt.y - vh * 0.6
    }
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div style={{ height: '100vh', background: '#060810', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <Navbar />

      {/* TOP BAR */}
      <div style={{
        position: 'fixed', top: 64, left: 0, right: 0, zIndex: 20,
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom,rgba(6,8,16,0.97) 0%,transparent 100%)',
      }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>My Roadmap</div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>ML Engineer · 8 modules · ~17 weeks</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: 100, padding: '6px 14px', fontSize: 12, color: '#34d399', fontWeight: 600,
          }}>2 / 8 complete</div>
          <div style={{
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 100, padding: '6px 14px', fontSize: 12, color: '#a78bfa',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>↕ Scroll to travel</div>
          <button
            onClick={() => setPinned(p => !p)}
            style={{
              background: pinned ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#f59e0b', padding: '8px 18px', borderRadius: 10,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {pinned ? '✓ Pinned' : '📌 Pin to Dashboard'}
          </button>
        </div>
      </div>

      {/* SCENE */}
      <div
        ref={containerRef}
        style={{ flex: 1, marginTop: 64, position: 'relative', overflow: 'hidden', cursor: 'grab' }}
      >
        {/* Ambient glows — fixed in viewport */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.1) 0%,transparent 70%)', top: -150, left: -150, filter: 'blur(90px)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.1) 0%,transparent 70%)', top: 60, left: 30, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.07) 0%,transparent 70%)', bottom: 0, right: 0, filter: 'blur(80px)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Floor grid */}
        <div style={{
          position: 'absolute', width: '220%', height: '220%', left: '-60%', top: '5%',
          transform: 'rotateX(72deg)', transformOrigin: 'center top',
          backgroundImage: 'linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px)',
          backgroundSize: '55px 55px', pointerEvents: 'none', zIndex: 0,
        }} />
        {/* Ceiling grid */}
        <div style={{
          position: 'absolute', width: '220%', height: '120%', left: '-60%', top: '-35%',
          transform: 'rotateX(-68deg)', transformOrigin: 'center bottom',
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.03) 1px,transparent 1px)',
          backgroundSize: '55px 55px', pointerEvents: 'none', zIndex: 0,
        }} />

        {/* THE VIRTUAL WORLD — pans with scroll */}
        <div style={{
          position: 'absolute',
          left: -pan.x, top: -pan.y,
          width: VW, height: VH,
          zIndex: 2,
        }}>
          {/* Canvas road */}
          <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, width: VW, height: VH, pointerEvents: 'none' }} />

          {/* NODES */}
          {NODES.map((node) => {
            const pos = getPathPoint(node.t)
            const c = statusColors[node.status]
            const isActive = node.status === 'active'
            const isDone = node.status === 'done'
            const isLocked = node.status === 'locked'
            const size = isActive ? 66 : isDone ? 60 : 52

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: pos.x - size / 2,
                  top: pos.y - size / 2,
                  zIndex: isActive ? 8 : 6,
                  opacity: isLocked ? 0.35 : 1,
                  cursor: isLocked ? 'default' : 'pointer',
                  animation: `float ${isActive ? 4 : 5}s ${node.t}s ease-in-out infinite`,
                }}
                onClick={() => !isLocked && setSelectedNode(prev => prev?.id === node.id ? null : node)}
              >
                {/* Rings */}
                {!isLocked && (
                  <>
                    <div style={{
                      position: 'absolute', width: size + 22, height: size + 22,
                      top: -11, left: -11, borderRadius: '50%',
                      border: `1px solid ${c.ring}`,
                      animation: 'ringExpand 2.2s ease-out infinite',
                    }} />
                    {isActive && (
                      <div style={{
                        position: 'absolute', width: size + 46, height: size + 46,
                        top: -23, left: -23, borderRadius: '50%',
                        border: '1px solid rgba(139,92,246,0.25)',
                        animation: 'ringExpand 2.8s 0.9s ease-out infinite',
                      }} />
                    )}
                  </>
                )}

                {/* Circle */}
                <div style={{
                  width: size, height: size, borderRadius: '50%',
                  background: c.bg, border: `${isActive ? 2.5 : 2}px solid ${c.border}`,
                  boxShadow: isLocked ? 'none' : `0 0 ${isActive ? 36 : 20}px ${c.glow}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isActive ? 24 : 20, color: c.text,
                  position: 'relative', zIndex: 1,
                }}>
                  {isDone ? '✓' : isActive ? '⚡' : '🔒'}
                </div>

                {/* YOU ARE HERE */}
                {isActive && (
                  <div style={{
                    position: 'absolute', top: -48, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                    color: 'white', fontSize: 9, fontWeight: 800,
                    padding: '5px 13px', borderRadius: 100,
                    whiteSpace: 'nowrap', letterSpacing: 1,
                    boxShadow: '0 0 16px rgba(124,58,237,0.7)',
                  }}>YOU ARE HERE</div>
                )}

                {/* Labels */}
                <div style={{
                  position: 'absolute', top: size + 12, left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', fontSize: isActive ? 13 : 11,
                  fontWeight: 700, color: c.text,
                  textShadow: isLocked ? 'none' : `0 0 10px ${c.glow}`,
                }}>{node.title}</div>
                <div style={{
                  position: 'absolute', top: size + 28, left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', fontSize: 10,
                  color: isLocked ? '#1f2937' : '#4b5563',
                }}>{node.duration}</div>
              </div>
            )
          })}

          {/* DESTINATION PIN */}
          {(() => {
            const dest = getPathPoint(1)
            return (
              <div style={{
                position: 'absolute',
                left: dest.x - 22,
                top: dest.y - 140,
                zIndex: 9,
                animation: 'float 3.5s ease-in-out infinite',
              }}>
                <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 28, height: 7, background: 'rgba(245,158,11,0.15)', borderRadius: '50%', filter: 'blur(5px)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 3, height: 90, background: 'linear-gradient(to top,#f59e0b,rgba(245,158,11,0.3) 70%,transparent)', borderRadius: 2 }} />
                <div style={{
                  position: 'absolute', bottom: 82, left: '50%', transform: 'translateX(-50%)',
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(245,158,11,0.12)', border: '2.5px solid #f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(245,158,11,0.7),0 0 60px rgba(245,158,11,0.25)',
                  animation: 'shimmer 2s ease-in-out infinite', fontSize: 18,
                }}>🎯</div>
                <div style={{
                  position: 'absolute', bottom: 124, left: 22,
                  width: 72, height: 26,
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(245,158,11,0.5)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#1a0a00', letterSpacing: 1 }}>GOAL</span>
                </div>
                <div style={{ position: 'absolute', bottom: 124, left: 22, width: 0, height: 0, borderTop: '13px solid transparent', borderBottom: '13px solid transparent', borderRight: '10px solid #92400e', transform: 'translateX(-10px)' }} />
                <div style={{ position: 'absolute', bottom: 158, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 800, color: '#f59e0b', textShadow: '0 0 14px rgba(245,158,11,0.9)' }}>ML Engineer</div>
                {[{ b: 108, l: -16, s: 11, d: 0.2 }, { b: 136, l: 72, s: 9, d: 0.8 }, { b: 88, l: 70, s: 13, d: 1.4 }].map((sp, i) => (
                  <div key={i} style={{ position: 'absolute', bottom: sp.b, left: sp.l, color: '#f59e0b', fontSize: sp.s, animation: `pulse 2s ${sp.d}s infinite` }}>✦</div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Depth fades */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '28%', height: '100%', background: 'linear-gradient(to right,#060810 0%,transparent 100%)', zIndex: 10, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(to bottom,#060810 0%,transparent 100%)', zIndex: 10, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top,#060810 0%,transparent 100%)', zIndex: 10, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '8%', height: '100%', background: 'linear-gradient(to left,#060810 0%,transparent 100%)', zIndex: 10, pointerEvents: 'none' }} />

        {/* Scroll progress bar */}
        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 3, height: 180, borderRadius: 2, background: 'rgba(139,92,246,0.12)', zIndex: 15 }}>
          <div style={{
            width: '100%', height: `${scrollProgress.current * 100}%`,
            background: 'linear-gradient(to bottom,#34d399,#8b5cf6)',
            borderRadius: 2, boxShadow: '0 0 8px rgba(139,92,246,0.5)',
            transition: 'height 0.1s',
          }} />
        </div>

        {/* Node detail panel */}
        {selectedNode && (
          <div style={{
            position: 'absolute', bottom: 70, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20, minWidth: 340,
            background: 'rgba(6,8,16,0.94)',
            border: `1px solid ${statusColors[selectedNode.status].border}`,
            borderRadius: 16, padding: '20px 28px',
            backdropFilter: 'blur(16px)',
            boxShadow: `0 0 40px ${statusColors[selectedNode.status].glow}`,
            display: 'flex', alignItems: 'center', gap: 18,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              background: statusColors[selectedNode.status].bg,
              border: `2px solid ${statusColors[selectedNode.status].border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: statusColors[selectedNode.status].text,
            }}>
              {selectedNode.status === 'done' ? '✓' : '⚡'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>{selectedNode.title}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  background: statusColors[selectedNode.status].bg,
                  color: statusColors[selectedNode.status].text,
                  border: `1px solid ${statusColors[selectedNode.status].border}`,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>{selectedNode.status}</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{selectedNode.subtitle} · {selectedNode.duration}</div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Bottom HUD */}
        <div style={{
          position: 'absolute', bottom: 20, left: '50%',
          transform: 'translateX(-50%)', zIndex: 15,
          background: 'rgba(6,8,16,0.88)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 100, padding: '10px 28px',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {[
            { color: '#34d399', label: 'Completed' },
            { color: '#8b5cf6', label: 'In progress', pulse: true },
            { color: '#1f2937', border: '#374151', label: 'Locked' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {i > 0 && <div style={{ width: 1, height: 14, background: 'rgba(139,92,246,0.2)', marginRight: 13 }} />}
              <div style={{
                width: 9, height: 9, borderRadius: '50%',
                background: item.color,
                border: (item as any).border ? `1px solid ${(item as any).border}` : 'none',
                boxShadow: item.color !== '#1f2937' ? `0 0 7px ${item.color}` : 'none',
                animation: item.pulse ? 'pulse 2s infinite' : 'none',
              }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.label}</span>
            </div>
          ))}
          <div style={{ width: 1, height: 14, background: 'rgba(139,92,246,0.2)' }} />
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>🎯 Goal: ML Engineer</span>
        </div>

        {/* Pinned toast */}
        {pinned && (
          <div style={{
            position: 'absolute', top: 20, left: '50%',
            transform: 'translateX(-50%)', zIndex: 20,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 12, padding: '12px 24px',
            fontSize: 13, color: '#f59e0b', fontWeight: 600,
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            📌 Roadmap pinned to your dashboard!
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1);} 50%{opacity:1;transform:scale(1.25);} }
        @keyframes shimmer { 0%,100%{opacity:0.7;} 50%{opacity:1;} }
        @keyframes ringExpand { 0%{transform:scale(1);opacity:0.7;} 100%{transform:scale(2);opacity:0;} }
      `}</style>
    </div>
  )
}