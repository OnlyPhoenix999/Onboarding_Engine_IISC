import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore'

interface Chat {
  id: string
  title: string
  createdAt: Date
  preview?: string
}

export default function History() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      try {
        const q = query(
          collection(db, 'users', user.uid, 'chats'),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        const loaded: Chat[] = snap.docs.map(d => ({
          id: d.id,
          title: d.data().title || 'Untitled chat',
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
        }))
        setChats(loaded)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [user])

  async function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) return
    await deleteDoc(doc(db, 'users', user.uid, 'chats', id))
    setChats(prev => prev.filter(c => c.id !== id))
  }

  function formatDate(date: Date) {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060810', fontFamily: "'DM Sans',sans-serif", color: '#f8fafc' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

      {/* TOP BAR */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(6,8,16,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: 0 }}>← Back</button>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800 }}>Chat History</div>
        </div>
        <button
          onClick={() => navigate('/chat')}
          style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >+ New chat</button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 1 }}>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4b5563', padding: '80px 0', fontSize: 14 }}>Loading history...</div>
        ) : chats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦊</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No chats yet</div>
            <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 28 }}>Start a conversation with Kira!</div>
            <button
              onClick={() => navigate('/chat')}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >Chat with Kira →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
              {chats.length} conversation{chats.length !== 1 ? 's' : ''}
            </div>
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat?id=${chat.id}`)}
                style={{
                  background: 'rgba(15,21,38,0.8)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  borderRadius: 14, padding: '18px 20px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.15)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(15,21,38,0.8)'
                }}
              >
                {/* Fox icon */}
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🦊</div>

                {/* Title + date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#4b5563' }}>
                    {formatDate(chat.createdAt)}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={e => deleteChat(chat.id, e)}
                  style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 16, padding: '4px 8px', borderRadius: 6, transition: 'all 0.2s', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#374151'}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}