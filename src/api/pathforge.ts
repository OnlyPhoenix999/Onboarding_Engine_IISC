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
  skill: string
  title?: string
  description: string
  duration: string
  duration_weeks: number
  week_start: number
  week_end: number
  type: 'foundation' | 'core' | 'advanced' | 'optional'
  status: 'locked' | 'available' | 'completed'
  children: string[]
  priority: 'high' | 'medium' | 'low'
  gap_score: number
  is_prerequisite_only: boolean
  prerequisites: string[]
  course_id?: string
  course_title?: string
  category: string
}

export interface RoadmapTimeline {
  nodes: RoadmapNode[]
  total_weeks: number
  high_weeks: number
  medium_weeks: number
  low_weeks: number
  candidate_name: string
  target_role: string
  match_score: number
  known_skills: string[]
  summary: string
}

const BASE = 'http://localhost:8000'

export async function analyzeDocuments(
  resumeFile: File,
  jobDescription: string
): Promise<AnalysisResult> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(resumeFile)
  })

  const form = new FormData()
  form.append('resume_b64',  base64)
  form.append('resume_name', resumeFile.name)
  form.append('jd_text',     jobDescription)

  const res = await fetch(`${BASE}/analyze`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`/analyze failed: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as AnalysisResult
}

export async function generateRoadmap(
  gapSkills: Skill[]
): Promise<RoadmapTimeline> {
  const res = await fetch(`${BASE}/roadmap`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ gapSkills }),
  })
  if (!res.ok) throw new Error(`/roadmap failed: ${res.status}`)
  const data = await res.json()

  // If backend returns flat array (old format) wrap it
  if (Array.isArray(data)) {
    return {
      nodes: data.map((n: any, i: number) => ({
        ...n,
        skill:                n.skill || n.title || 'Skill',
        duration_weeks:       parseInt(n.duration) || 1,
        week_start:           i + 1,
        week_end:             i + 2,
        priority:             n.priority || 'medium',
        gap_score:            0.5,
        is_prerequisite_only: false,
        prerequisites:        [],
        category:             n.type || 'core',
      })),
      total_weeks:    data.length * 2,
      high_weeks:     0,
      medium_weeks:   0,
      low_weeks:      0,
      candidate_name: 'Candidate',
      target_role:    'Target Role',
      match_score:    0,
      known_skills:   [],
      summary:        '',
    }
  }

  return data as RoadmapTimeline
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res  = await fetch(`${BASE}/health`)
    const data = await res.json()
    return data.status === 'ok'
  } catch { return false }
}