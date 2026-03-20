import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FoxMascot from '../components/FoxMascot'
import { analyzeDocuments } from '../api/pathforge'

const stages = [
  { message: "Parsing your resume... extracting skills and experience levels.", duration: 2500 },
  { message: "Reading the job description... identifying role requirements.", duration: 2000 },
  { message: "Cross-referencing your skills against the role... this is where the magic happens ✨", duration: 3000 },
  { message: "Scoring skill gaps by priority and criticality...", duration: 2000 },
  { message: "Building your personalized learning roadmap... almost there! 🗺", duration: 2500 },
]

export default function Processing() {
  const navigate = useNavigate()
  const [stageIndex, setStageIndex] = useState(0)
  const [dots, setDots] = useState('.')
  const [done, setDone] = useState(false)

  // Cycle through speech bubble messages
  useEffect(() => {
    let current = 0
    function next() {
      current++
      if (current < stages.length) {
        setStageIndex(current)
        setTimeout(next, stages[current].duration)
      } else {
        setDone(true)
      }
    }
    setTimeout(next, stages[0].duration)
  }, [])

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 400)
    return () => clearInterval(t)
  }, [])

  // Call mock API and navigate when done
  useEffect(() => {
    async function run() {
      try {
        const result = await analyzeDocuments(
          new File([], sessionStorage.getItem('resumeName') || 'resume.pdf'),
          sessionStorage.getItem('jdText') || ''
        )
        sessionStorage.setItem('analysisResult', JSON.stringify(result))
        navigate('/skillgap')
      } catch (e) {
        console.error(e)
      }
    }
    run()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--navy)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* bg grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Glow blobs */}
      <div style={{
        position: 'fixed', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        filter: 'blur(100px)', pointerEvents: 'none',
        animation: 'glowPulse 3s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 600 }}>

        {/* Speech bubble */}
        <div style={{
          background: 'var(--navy2)',
          border: '1px solid var(--border)',
          borderRadius: 20, padding: '24px 32px',
          fontSize: 16, lineHeight: 1.7,
          color: 'var(--white)', marginBottom: 8,
          boxShadow: '0 0 60px rgba(124,58,237,0.15)',
          minHeight: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.5s ease',
          position: 'relative',
        }}>
          <span style={{ color: 'var(--cyan)', marginRight: 8 }}>Kira:</span>
          {stages[stageIndex].message}
          {/* bubble tail pointing down */}
          <div style={{
            position: 'absolute', bottom: -12, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '12px solid var(--navy2)',
          }} />
        </div>

        <FoxMascot size={300} style={{ margin: '0 auto' }} />

        {/* Stage progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          {stages.map((_, i) => (
            <div key={i} style={{
              width: i === stageIndex ? 24 : 8,
              height: 8, borderRadius: 4,
              background: i < stageIndex
                ? 'var(--cyan)'
                : i === stageIndex
                  ? 'var(--violet-bright)'
                  : 'var(--navy2)',
              border: '1px solid var(--border)',
              transition: 'all 0.4s ease',
            }} />
          ))}
        </div>

        <p style={{
          marginTop: 24, fontSize: 14,
          color: 'var(--muted)', letterSpacing: 1,
        }}>
          Analyzing{dots}
        </p>
      </div>
    </div>
  )
}