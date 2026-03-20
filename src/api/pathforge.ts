// src/api/pathforge.ts
// Real FastAPI backend — http://localhost:8000

export interface AnalysisResult {
  candidateName: string
  targetRole: string
  matchScore: number
  matchedSkills: Skill[]
  gapSkills: Skill[]
}

export interface Skill {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  priority?: 'high' | 'medium' | 'low'
}

export interface RoadmapNode {
  id: string
  title: string
  description: string
  duration: string
  type: 'foundation' | 'core' | 'advanced' | 'optional'
  status: 'locked' | 'available' | 'completed'
  children: string[]
}

const BASE = 'http://localhost:8000'

// ── /analyze ─────────────────────────────────────────────────────────────────
export async function analyzeDocuments(
  resumeFile: File,
  jobDescription: string
): Promise<AnalysisResult> {

  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(resumeFile)
  })

  const form = new FormData()
  form.append('resume_b64', base64)
  form.append('resume_name', resumeFile.name)
  form.append('jd_text', jobDescription)

  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) throw new Error(`/analyze failed: ${res.status}`)

  const data = await res.json()

  if (data.error) throw new Error(data.error)

  return data as AnalysisResult
}

// ── /roadmap ──────────────────────────────────────────────────────────────────
export async function generateRoadmap(
  gapSkills: Skill[]
): Promise<RoadmapNode[]> {

  const res = await fetch(`${BASE}/roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gapSkills }),
  })

  if (!res.ok) throw new Error(`/roadmap failed: ${res.status}`)

  const data = await res.json()
  return data as RoadmapNode[]
}

// ── /health ───────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`)
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}