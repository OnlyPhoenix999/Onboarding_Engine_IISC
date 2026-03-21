import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FoxMascot from '../components/FoxMascot'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const stages = [
  { message: "Parsing your resume... extracting skills and experience.", duration: 2500 },
  { message: "Reading the job description... identifying requirements.", duration: 2000 },
  { message: "Cross-referencing your skills against the role ✨", duration: 2500 },
  { message: "Scoring skill gaps by priority...", duration: 2000 },
  { message: "Building your personalized roadmap... almost there! 🗺", duration: 2000 },
]

export default function Processing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stageIndex, setStageIndex] = useState(0)
  const [dots, setDots] = useState('.')
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 400)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function run() {
      try {
        const resumeName     = sessionStorage.getItem('resumeName') || 'resume.pdf'
        const jdText         = sessionStorage.getItem('jdText') || ''
        const resumeFileData = sessionStorage.getItem('resumeFileData')

        if (!resumeFileData) throw new Error('No resume file found. Please upload again.')
        if (!jdText.trim())  throw new Error('No job description found. Please try again.')

        const BASE = 'http://localhost:8000'

        // Call /analyze
        const form = new FormData()
        form.append('resume_b64',  resumeFileData)
        form.append('resume_name', resumeName)
        form.append('jd_text',     jdText)

        const analyzeRes = await fetch(`${BASE}/analyze`, { method: 'POST', body: form })
        if (!analyzeRes.ok) throw new Error(`Backend error: ${analyzeRes.status}`)
        const result = await analyzeRes.json()
        if (result.error) throw new Error(result.error)

        // Call /roadmap
        const roadmapRes = await fetch(`${BASE}/roadmap`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ gapSkills: result.gapSkills }),
        })
        if (!roadmapRes.ok) throw new Error(`Roadmap error: ${roadmapRes.status}`)
        const roadmapRaw = await roadmapRes.json()

        // Normalise roadmap — handle both array and RoadmapTimeline formats
        let roadmapNodes: any[] = []
        if (Array.isArray(roadmapRaw)) {
          roadmapNodes = roadmapRaw
        } else if (roadmapRaw?.nodes) {
          roadmapNodes = roadmapRaw.nodes
        }

        // Ensure every node has required fields
        roadmapNodes = roadmapNodes.map((n: any, i: number) => ({
          ...n,
          skill:                n.skill || n.title || 'Skill',
          priority:             n.priority || 'medium',
          duration_weeks:       n.duration_weeks || parseInt(n.duration) || 1,
          week_start:           n.week_start || i + 1,
          week_end:             n.week_end   || i + 2,
          gap_score:            n.gap_score  || 0.5,
          is_prerequisite_only: n.is_prerequisite_only || false,
          prerequisites:        n.prerequisites || [],
          category:             n.category || n.type || 'core',
          status:               n.status || (i === 0 ? 'available' : 'locked'),
        }))

        // Store in sessionStorage
        sessionStorage.setItem('analysisResult',  JSON.stringify(result))
        sessionStorage.setItem('roadmapNodes',     JSON.stringify(roadmapNodes))

        // Save everything to Firestore
        if (user) {
          await addDoc(collection(db, 'users', user.uid, 'analyses'), {
            targetRole:    result.targetRole,
            candidateName: result.candidateName,
            matchScore:    result.matchScore,
            matchedCount:  result.matchedSkills.length,
            gapCount:      result.gapSkills.length,
            matchedSkills: result.matchedSkills,
            gapSkills:     result.gapSkills,
            roadmapNodes:  roadmapNodes,
            createdAt:     serverTimestamp(),
          })
        }

        navigate('/skillgap')

      } catch (e: any) {
        console.error('Analysis failed:', e)
        setError(e?.message || 'Something went wrong.')
      }
    }
    run()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      <div style={{ position: 'fixed', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.2) 0%,transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 600, padding: '0 32px' }}>
        {error ? (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '28px 32px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', marginBottom: 10 }}>⚠️ Analysis failed</div>
            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>{error}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Make sure the backend is running:<br />
              <code style={{ color: '#a78bfa', fontSize: 12 }}>uvicorn api:app --reload --port 8000</code>
            </div>
            <button onClick={() => navigate('/upload')} style={{ background: 'linear-gradient(135deg,var(--violet),var(--cyan))', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>← Try again</button>
          </div>
        ) : (
          <>
            <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 32px', fontSize: 16, lineHeight: 1.7, color: 'var(--white)', marginBottom: 8, minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 0 60px rgba(124,58,237,0.15)' }}>
              <span style={{ color: 'var(--cyan)', marginRight: 8, fontWeight: 600 }}>Kira:</span>
              {stages[stageIndex].message}
              <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '12px solid var(--navy2)' }} />
            </div>
            <FoxMascot size={300} style={{ margin: '0 auto' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
              {stages.map((_, i) => (
                <div key={i} style={{ width: i === stageIndex ? 24 : 8, height: 8, borderRadius: 4, background: i < stageIndex ? 'var(--cyan)' : i === stageIndex ? 'var(--violet-bright)' : 'var(--navy2)', border: '1px solid var(--border)', transition: 'all 0.4s ease' }} />
              ))}
            </div>
            <p style={{ marginTop: 24, fontSize: 14, color: 'var(--muted)', letterSpacing: 1 }}>Analyzing{dots}</p>
          </>
        )}
      </div>
    </div>
  )
}