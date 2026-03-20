import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FoxMascot from '../components/FoxMascot'
import { generateRoadmap } from '../api/pathforge'
import type { RoadmapNode } from '../api/pathforge'

const typeColors = {
  foundation: { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.4)', text: '#22d3ee', label: 'Foundation' },
  core: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(139,92,246,0.4)', text: '#a78bfa', label: 'Core' },
  advanced: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', text: '#fbbf24', label: 'Advanced' },
  optional: { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', text: '#9ca3af', label: 'Optional' },
}

export default function Roadmap() {
  const navigate = useNavigate()
  const [nodes, setNodes] = useState<RoadmapNode[]>([])
  const [visibleNodes, setVisibleNodes] = useState<string[]>([])
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedNodes, setCompletedNodes] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const raw = sessionStorage.getItem('analysisResult')
      const result = raw ? JSON.parse(raw) : null
      const roadmap = await generateRoadmap(result?.gapSkills || [])
      setNodes(roadmap)
      setLoading(false)
      // Animate nodes appearing one by one
      roadmap.forEach((node, i) => {
        setTimeout(() => {
          setVisibleNodes(prev => [...prev, node.id])
        }, i * 300)
      })
    }
    load()
  }, [])

  // Build tree layout — levels based on dependencies
  function getNodeLevel(nodeId: string, memo: Record<string, number> = {}): number {
    if (memo[nodeId] !== undefined) return memo[nodeId]
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return 0
    const parents = nodes.filter(n => n.children.includes(nodeId))
    if (parents.length === 0) { memo[nodeId] = 0; return 0 }
    memo[nodeId] = Math.max(...parents.map(p => getNodeLevel(p.id, memo))) + 1
    return memo[nodeId]
  }

  const levels: RoadmapNode[][] = []
  nodes.forEach(node => {
    const level = getNodeLevel(node.id)
    if (!levels[level]) levels[level] = []
    levels[level].push(node)
  })

  const NODE_W = 200
  const NODE_H = 90
  const H_GAP = 40
  const V_GAP = 80
  const svgWidth = Math.max(...levels.map(l => l.length * (NODE_W + H_GAP))) + 80
  const svgHeight = levels.length * (NODE_H + V_GAP) + 80

  function getNodeX(levelNodes: RoadmapNode[], index: number) {
    const totalW = levelNodes.length * NODE_W + (levelNodes.length - 1) * H_GAP
    const startX = (svgWidth - totalW) / 2
    return startX + index * (NODE_W + H_GAP)
  }

  function getNodeY(level: number) {
    return 40 + level * (NODE_H + V_GAP)
  }

  function toggleComplete(nodeId: string) {
    setCompletedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--muted)', fontSize: 16 }}>Building your roadmap...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <Navbar />

      <div style={{ position: 'relative', zIndex: 1, padding: '100px 48px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 2,
              textTransform: 'uppercase', color: 'var(--cyan)',
              display: 'block', marginBottom: 12,
            }}>Your learning path</span>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(28px, 3vw, 44px)',
              fontWeight: 800, letterSpacing: '-1.5px',
              lineHeight: 1.1, marginBottom: 8,
            }}>Personalized Roadmap</h1>
            <p style={{ color: 'var(--muted)', fontSize: 15 }}>
              {nodes.length} modules · {nodes.reduce((a, n) => a + parseInt(n.duration), 0)} weeks total ·
              Click any node to see details
            </p>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            background: 'var(--navy2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
          }}>
            {Object.entries(typeColors).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: val.bg, border: `1px solid ${val.border}`,
                }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Progress: {completedNodes.length} / {nodes.length} modules
            </span>
            <span style={{ fontSize: 13, color: 'var(--cyan)' }}>
              {Math.round(completedNodes.length / nodes.length * 100)}% complete
            </span>
          </div>
          <div style={{
            height: 6, background: 'var(--navy2)',
            borderRadius: 3, overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              height: '100%',
              width: `${completedNodes.length / nodes.length * 100}%`,
              background: 'linear-gradient(90deg, var(--violet), var(--cyan))',
              borderRadius: 3, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* SVG Graph */}
        <div style={{
          background: 'var(--navy2)',
          border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'auto',
          padding: 24,
        }}>
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{ display: 'block', margin: '0 auto', minWidth: '100%' }}
          >
            {/* Draw edges */}
            {nodes.map(node => {
              const nodeLevel = getNodeLevel(node.id)
              const levelNodes = levels[nodeLevel] || []
              const nodeIndex = levelNodes.findIndex(n => n.id === node.id)
              const x1 = getNodeX(levelNodes, nodeIndex) + NODE_W / 2
              const y1 = getNodeY(nodeLevel) + NODE_H

              return node.children.map(childId => {
                const childLevel = getNodeLevel(childId)
                const childLevelNodes = levels[childLevel] || []
                const childIndex = childLevelNodes.findIndex(n => n.id === childId)
                const x2 = getNodeX(childLevelNodes, childIndex) + NODE_W / 2
                const y2 = getNodeY(childLevel)
                const isCompleted = completedNodes.includes(node.id)

                return (
                  <path
                    key={`${node.id}-${childId}`}
                    d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isCompleted ? 'var(--cyan)' : 'rgba(139,92,246,0.3)'}
                    strokeWidth={isCompleted ? 2 : 1.5}
                    strokeDasharray={isCompleted ? 'none' : '4 4'}
                  />
                )
              })
            })}

            {/* Draw nodes */}
            {nodes.map(node => {
              const level = getNodeLevel(node.id)
              const levelNodes = levels[level] || []
              const index = levelNodes.findIndex(n => n.id === node.id)
              const x = getNodeX(levelNodes, index)
              const y = getNodeY(level)
              const colors = typeColors[node.type]
              const isVisible = visibleNodes.includes(node.id)
              const isCompleted = completedNodes.includes(node.id)
              const isSelected = selectedNode?.id === node.id

              return (
                <g
                  key={node.id}
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                >
                  {/* Node bg */}
                  <rect
                    x={x} y={y}
                    width={NODE_W} height={NODE_H}
                    rx={12}
                    fill={isCompleted ? 'rgba(16,185,129,0.12)' : colors.bg}
                    stroke={isSelected ? 'white' : isCompleted ? '#10b981' : colors.border}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {/* Type badge */}
                  <rect
                    x={x + 10} y={y + 10}
                    width={60} height={16}
                    rx={4}
                    fill={isCompleted ? 'rgba(16,185,129,0.2)' : `${colors.text}22`}
                  />
                  <text
                    x={x + 40} y={y + 21}
                    textAnchor="middle"
                    fill={isCompleted ? '#10b981' : colors.text}
                    fontSize={9} fontWeight={600}
                    style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    {isCompleted ? 'DONE ✓' : colors.label}
                  </text>
                  {/* Title */}
                  <text
                    x={x + 10} y={y + 44}
                    fill={isCompleted ? '#10b981' : 'white'}
                    fontSize={12} fontWeight={700}
                  >
                    {node.title.length > 22 ? node.title.slice(0, 22) + '…' : node.title}
                  </text>
                  {/* Duration */}
                  <text
                    x={x + 10} y={y + 62}
                    fill="rgba(148,163,184,0.8)"
                    fontSize={10}
                  >⏱ {node.duration}</text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Selected node detail panel */}
        {selectedNode && (
          <div style={{
            marginTop: 24,
            background: 'var(--navy2)',
            border: `1px solid ${typeColors[selectedNode.type].border}`,
            borderRadius: 16, padding: '28px 32px',
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', gap: 24,
            boxShadow: `0 0 40px ${typeColors[selectedNode.type].text}22`,
            animation: 'fadeUp 0.3s ease both',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{
                  background: `${typeColors[selectedNode.type].text}22`,
                  color: typeColors[selectedNode.type].text,
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 100,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  border: `1px solid ${typeColors[selectedNode.type].border}`,
                }}>{typeColors[selectedNode.type].label}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>⏱ {selectedNode.duration}</span>
              </div>
              <h3 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 22, fontWeight: 800, marginBottom: 10,
              }}>{selectedNode.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
                {selectedNode.description}
              </p>
            </div>
            <button
              onClick={() => toggleComplete(selectedNode.id)}
              style={{
                background: completedNodes.includes(selectedNode.id)
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(16,185,129,0.1)',
                color: completedNodes.includes(selectedNode.id) ? '#ef4444' : '#10b981',
                border: `1px solid ${completedNodes.includes(selectedNode.id) ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                padding: '10px 20px', borderRadius: 10,
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {completedNodes.includes(selectedNode.id) ? '✗ Mark incomplete' : '✓ Mark complete'}
            </button>
          </div>
        )}

        {/* Kira bottom helper */}
        <div style={{
          marginTop: 40, display: 'flex', alignItems: 'center', gap: 20,
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 28px',
        }}>
          <FoxMascot size={72} style={{ animation: 'none', flexShrink: 0 }} />
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--white)' }}>Kira says:</strong> Start with the{' '}
            <strong style={{ color: 'var(--cyan)' }}>Foundation</strong> nodes first — they unlock everything else.
            Click any node to see details and mark your progress. You've got this! 💪
          </p>
        </div>
      </div>
    </div>
  )
}