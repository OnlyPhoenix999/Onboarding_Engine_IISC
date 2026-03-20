// src/api/pathforge.ts
// Mock data now — swap these for real FastAPI calls later

export interface AnalysisResult {
  matchedSkills: Skill[]
  gapSkills: Skill[]
  candidateName: string
  targetRole: string
  matchScore: number
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

// ── MOCK RESPONSES ──────────────────────────────────────────
// Replace with: const res = await fetch('http://localhost:8000/analyze', { method: 'POST', body: formData })

export async function analyzeDocuments(
  resumeFile: File,
  jobDescription: string
): Promise<AnalysisResult> {
  // Simulate API delay
  await new Promise(r => setTimeout(r, 4000))

  return {
    candidateName: 'Alex Johnson',
    targetRole: 'ML Engineer',
    matchScore: 68,
    matchedSkills: [
      { name: 'Python', level: 'advanced', category: 'Programming' },
      { name: 'Data Analysis', level: 'intermediate', category: 'Analytics' },
      { name: 'SQL', level: 'intermediate', category: 'Database' },
      { name: 'Git', level: 'advanced', category: 'Tools' },
      { name: 'Statistics', level: 'intermediate', category: 'Mathematics' },
      { name: 'Pandas', level: 'advanced', category: 'Libraries' },
      { name: 'NumPy', level: 'intermediate', category: 'Libraries' },
      { name: 'REST APIs', level: 'intermediate', category: 'Backend' },
      { name: 'Linux', level: 'beginner', category: 'Tools' },
      { name: 'Jupyter', level: 'advanced', category: 'Tools' },
      { name: 'Matplotlib', level: 'intermediate', category: 'Libraries' },
      { name: 'Problem Solving', level: 'advanced', category: 'Soft Skills' },
    ],
    gapSkills: [
      { name: 'PyTorch', level: 'beginner', category: 'ML Frameworks', priority: 'high' },
      { name: 'TensorFlow', level: 'beginner', category: 'ML Frameworks', priority: 'high' },
      { name: 'MLOps', level: 'beginner', category: 'DevOps', priority: 'high' },
      { name: 'Kubernetes', level: 'beginner', category: 'DevOps', priority: 'medium' },
      { name: 'Feature Engineering', level: 'beginner', category: 'ML', priority: 'high' },
      { name: 'Model Deployment', level: 'beginner', category: 'MLOps', priority: 'high' },
      { name: 'Docker', level: 'beginner', category: 'DevOps', priority: 'medium' },
      { name: 'Spark', level: 'beginner', category: 'Big Data', priority: 'medium' },
      { name: 'AWS SageMaker', level: 'beginner', category: 'Cloud', priority: 'low' },
    ],
  }
}

export async function generateRoadmap(
  gapSkills: Skill[]
): Promise<RoadmapNode[]> {
  await new Promise(r => setTimeout(r, 1000))

  return [
    {
      id: 'n1', title: 'Python for ML', duration: '2 weeks',
      description: 'Solidify Python fundamentals specifically for machine learning workflows.',
      type: 'foundation', status: 'available', children: ['n2', 'n3'],
    },
    {
      id: 'n2', title: 'PyTorch Fundamentals', duration: '3 weeks',
      description: 'Tensors, autograd, neural network basics using PyTorch.',
      type: 'core', status: 'locked', children: ['n4'],
    },
    {
      id: 'n3', title: 'Feature Engineering', duration: '2 weeks',
      description: 'Transform raw data into meaningful ML features.',
      type: 'core', status: 'locked', children: ['n4'],
    },
    {
      id: 'n4', title: 'Model Training & Evaluation', duration: '3 weeks',
      description: 'Train, validate and evaluate ML models end-to-end.',
      type: 'core', status: 'locked', children: ['n5', 'n6'],
    },
    {
      id: 'n5', title: 'Docker & Containerization', duration: '1 week',
      description: 'Package ML models into containers for reproducibility.',
      type: 'advanced', status: 'locked', children: ['n7'],
    },
    {
      id: 'n6', title: 'MLOps Fundamentals', duration: '2 weeks',
      description: 'CI/CD pipelines, model versioning, monitoring.',
      type: 'advanced', status: 'locked', children: ['n7'],
    },
    {
      id: 'n7', title: 'Model Deployment', duration: '2 weeks',
      description: 'Deploy models to production using FastAPI + cloud.',
      type: 'advanced', status: 'locked', children: ['n8'],
    },
    {
      id: 'n8', title: 'AWS SageMaker', duration: '2 weeks',
      description: 'Cloud-native ML pipelines on AWS.',
      type: 'optional', status: 'locked', children: [],
    },
  ]
}