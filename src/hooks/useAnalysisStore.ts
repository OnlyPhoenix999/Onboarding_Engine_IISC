import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

export interface StoredAnalysis {
  targetRole: string
  matchScore: number
  matchedSkills: any[]
  gapSkills: any[]
  roadmapNodes?: any[]
  createdAt?: any
}

export async function loadAnalysis(
  uid: string,
  analysisId: string
): Promise<StoredAnalysis | null> {
  try {
    const ref  = doc(db, 'users', uid, 'analyses', analysisId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data() as StoredAnalysis
  } catch (e) {
    console.error('loadAnalysis error:', e)
    return null
  }
}