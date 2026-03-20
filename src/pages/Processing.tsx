import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FoxMascot from '../components/FoxMascot'
import { analyzeDocuments, generateRoadmap } from '../api/pathforge'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const stages = [
  { message: "Parsing your resume... extracting skills and experience levels.", duration: 2000 },
  { message: "Reading the job description... identifying role requirements.", duration: 2000 },
  { message: "Cross-referencing your skills against the role... this is where the magic happens ✨", duration: 2500 },
  { message: "Scoring skill gaps by priority and criticality...", duration: 2000 },
  { message: "Building your personalized learning roadmap... almost there! 🗺", duration: 2000 },
]

export default function Processing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stageIndex, setStageIndex] = useState(0)
  const [dots, setDots] = useState('.')
  const [error, setError] = useState<string | null>(null)

  // Cycle speech bubble stages
  useEffect(() => {
    let current = 0
    function next() {
      current++
      if (current < stages.length) {
        setStageIndex(current)
        setTimeout(next, stages[current].duration)
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

  // Call real backend
  useEffect(() => {
    async function run() {
      try {
        const resumeName = sessionStorage.getItem('resumeName') || 'resume.pdf'
        const jdText = sessionStorage.getItem('jdText') || ''
        const resumeFileData = sessionStorage.getItem('resumeFileData') // base64

        let resumeFile: File

        if (resumeFileData) {
          // Reconstruct file from base64 stored in sessionStorage
          const res = await fetch(resumeFileData)
          const blob = await res.blob()
          resumeFile = new File([blob], resumeName)
        } else {
          // Fallback empty file — will likely error gracefully
          resumeFile = new File([], resumeName)
        }

        // Call real /analyze endpoint
        const result = await analyzeDocuments(resumeFile, jdText)

        // Call real /roadmap endpoint
        const roadmapNodes = await generateRoadmap(result.gapSkills)

        // Store everything in sessionStorage for downstream pages
        sessionStorage.setItem('analysisResult', JSON.stringify(result))
        sessionStorage.setItem('roadmapNodes', JSON.stringify(roadmapNodes))

        // Save to Firestore
        if (user) {
          await addDoc(collection(db, 'users', user.uid, 'analyses'), {
            targetRole: result.targetRole,
            matchScore: result.matchScore,
            candidateName: result.candidateName,
            matchedCount: result.matchedSkills.length,
            gapCount: result.gapSkills.length,
            matchedSkills: result.matchedSkills,
            gapSkills: result.gapSkills,
            roadmapNodes: roadmapNodes,
            createdAt: serverTimestamp(),
          })
        }

        navigate('/skillgap')
      } catch (e: any) {
        console.error('Analysis failed:', e)
        setError(e?.message || 'Something went wrong. Is the backend running?')
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

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div style={{
        position: 'fixed', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        filter: 'blur(100px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 600, padding: '0 32px' }}>

        {/* Error state */}
        {error ? (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 16, padding: '24px 32px',
            marginBottom: 32,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>
              ⚠️ Analysis failed
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
              {error}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Make sure the backend is running:<br />
              <code style={{ color: '#a78bfa' }}>uvicorn api:app --reload --port 8000</code>
            </div>
            <button
              onClick={() => navigate('/upload')}
              style={{ background: 'linear-gradient(135deg,var(--violet),var(--cyan))', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
            >← Go back</button>
          </div>
        ) : (
          <>
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
              position: 'relative',
            }}>
              <span style={{ color: 'var(--cyan)', marginRight: 8, fontWeight: 600 }}>Kira:</span>
              {stages[stageIndex].message}
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

            {/* Stage dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
              {stages.map((_, i) => (
                <div key={i} style={{
                  width: i === stageIndex ? 24 : 8,
                  height: 8, borderRadius: 4,
                  background: i < stageIndex ? 'var(--cyan)' : i === stageIndex ? 'var(--violet-bright)' : 'var(--navy2)',
                  border: '1px solid var(--border)',
                  transition: 'all 0.4s ease',
                }} />
              ))}
            </div>

            <p style={{ marginTop: 24, fontSize: 14, color: 'var(--muted)', letterSpacing: 1 }}>
              Analyzing{dots}
            </p>
          </>
        )}
      </div>
    </div>
  )
}