'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CommunityPage() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('lost-and-found')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUser(user)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">💬 Community</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">Back to Home</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tab bar */}
        <div className="flex gap-2 mb-8 border-b overflow-x-auto">
          {[
            { key: 'lost-and-found', label: '🔍 Lost & Found' },
            { key: 'events', label: '🎉 Events' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition -mb-px ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'lost-and-found' && <LostAndFound user={user} />}
        {activeTab === 'events' && <Events user={user} />}
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">☕ Buy me a coffee!</a>
        </div>
      </footer>
    </div>
  )
}


// ─── LOST & FOUND ────────────────────────────────────────────────────────────

function LostAndFound({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedPost, setSelectedPost] = useState(null)

  const LAF_CATEGORIES = [
    'Electronics', 'Clothing & Accessories', 'Keys & ID',
    'Water Bottles & Bags', 'Books & Stationery',
    'Jewelry', 'Sports Equipment', 'Other'
  ]

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    // Mark all current posts as seen
    const markAsSeen = async () => {
      const { data } = await supabase.from('lost_and_found').select('id').gt('expires_at', new Date().toISOString())
      if (data) {
        const ids = data.map(p => p.id)
        localStorage.setItem('seenLostFound', JSON.stringify(ids))
      }
    }
    markAsSeen()
  }, [])

  const fetchPosts = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('lost_and_found')
        .select('*, profiles!lost_and_found_user_id_fkey(name, email)')
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
      if (error) throw error

      const postsWithImages = await Promise.all((data || []).map(async (post) => {
        const { data: images } = await supabase
          .from('lost_and_found_images')
          .select('image_url')
          .eq('post_id', post.id)
          .order('display_order', { ascending: true })
        return { ...post, images: images || [] }
      }))
      setPosts(postsWithImages)
    } catch (error) {
      console.error('Error fetching lost and found:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsFound = async (postId) => {
    if (!confirm('Mark this item as found? 🎉')) return
    await supabase.from('lost_and_found').update({ status: 'found' }).eq('id', postId)
    fetchPosts()
  }

  const extendPost = async (postId) => {
    if (!confirm('Extend your post by 30 more days?')) return
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('lost_and_found').update({ extended: true, expires_at: newExpiry }).eq('id', postId)
    fetchPosts()
  }

  const getDaysAgo = (createdAt) => {
    const diff = Date.now() - new Date(createdAt).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
  }

  const getDaysLeft = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const filtered = activeFilter === 'all' ? posts : posts.filter(p => p.category === activeFilter)
  const lostPosts = filtered.filter(p => p.status === 'lost')
  const foundPosts = filtered.filter(p => p.status === 'found')

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">🔍 Lost & Found</h2>
          <p className="text-gray-500 text-sm mt-1">Unlike Sidechat, posts here stay visible and are easy to find — not lost in a feed.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition text-sm"
        >
          + Post Lost Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setActiveFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {LAF_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
        ))}
      </div>

      {/* Lost posts */}
      {lostPosts.length === 0 && foundPosts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-500">No lost items posted yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {lostPosts.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-red-600 mb-3">😟 Still Lost ({lostPosts.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lostPosts.map(post => (
                  <LostAndFoundCard
                    key={post.id}
                    post={post}
                    user={user}
                    onMarkFound={markAsFound}
                    onExtend={extendPost}
                    getDaysAgo={getDaysAgo}
                    getDaysLeft={getDaysLeft}
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
              </div>
            </div>
          )}

          {foundPosts.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-green-600 mb-3">✅ Found ({foundPosts.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {foundPosts.map(post => (
                  <LostAndFoundCard
                    key={post.id}
                    post={post}
                    user={user}
                    onMarkFound={markAsFound}
                    onExtend={extendPost}
                    getDaysAgo={getDaysAgo}
                    getDaysLeft={getDaysLeft}
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create post modal */}
      {showCreate && (
        <CreateLostAndFoundModal
          user={user}
          categories={LAF_CATEGORIES}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPosts() }}
        />
      )}

      {/* View post modal */}
      {selectedPost && (
        <ViewLostAndFoundModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
          onMarkFound={() => { markAsFound(selectedPost.id); setSelectedPost(null) }}
          getDaysAgo={getDaysAgo}
        />
      )}
    </div>
  )
}

function LostAndFoundCard({ post, user, onMarkFound, onExtend, getDaysAgo, getDaysLeft, onClick }) {
  const isOwner = user?.id === post.user_id
  const isFound = post.status === 'found'
  const daysLeft = getDaysLeft(post.expires_at)
  const image = post.images?.[0]?.image_url

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer ${isFound ? 'opacity-75' : ''}`} onClick={onClick}>
      {image && (
        <div className="relative">
          <img src={image} alt={post.title} className={`w-full h-40 object-cover ${isFound ? 'grayscale' : ''}`} />
          {isFound && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-green-500 text-white font-bold text-lg px-4 py-2 rounded-full shadow">FOUND! 🎉</span>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-900">{post.title}</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{post.category}</span>
        </div>
        {post.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.description}</p>}
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Posted by {post.profiles?.name} • {getDaysAgo(post.created_at)}</span>
          {!isFound && daysLeft <= 7 && (
            <span className="text-orange-500 font-medium">{daysLeft}d left</span>
          )}
        </div>
        {isOwner && !isFound && (
          <div className="flex gap-2 mt-3 pt-3 border-t" onClick={e => e.stopPropagation()}>
            <button onClick={() => onMarkFound(post.id)} className="flex-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-200 transition">✅ Mark as Found</button>
            {!post.extended && (
              <button onClick={() => onExtend(post.id)} className="flex-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">⏰ Extend 30d</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateLostAndFoundModal({ user, categories, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleImages = (e) => {
    const files = Array.from(e.target.files)
    const combined = [...images, ...files].slice(0, 5)
    setImages(combined)
    setPreviews(combined.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!category) { setMessage('Please select a category.'); return }
    setSaving(true)
    try {
      const { data: post, error } = await supabase
        .from('lost_and_found')
        .insert([{ user_id: user.id, title, description, category }])
        .select().single()
      if (error) throw error

      for (let i = 0; i < images.length; i++) {
        const file = images[i]
        const ext = file.name.split('.').pop()
        const fileName = `laf-${user.id}-${Date.now()}-${i}.${ext}`
        const { error: uploadError } = await supabase.storage.from('listing-images').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(fileName)
        await supabase.from('lost_and_found_images').insert([{ post_id: post.id, image_url: publicUrl, display_order: i }])
      }
      onCreated()
    } catch (error) {
      setMessage('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-1">🔍 Post Lost Item</h2>
        <p className="text-gray-500 text-sm mb-6">Your post will be visible for 30 days and can be extended once.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Black AirPods Pro" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-3 py-2 border rounded-md">
              <option value="">Select category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows="3" placeholder="Where did you last see it? Any identifying features?" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Photos (optional, up to 5)</label>
            <input type="file" accept="image/*" multiple onChange={handleImages} className="w-full px-3 py-2 border rounded-md text-sm" />
            {previews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {previews.map((p, i) => <img key={i} src={p} alt="" className="w-16 h-16 object-cover rounded-md border" />)}
              </div>
            )}
          </div>
          {message && <p className="text-red-600 text-sm">{message}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">{saving ? 'Posting...' : 'Post'}</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ViewLostAndFoundModal({ post, user, onClose, onMarkFound, getDaysAgo }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const isOwner = user?.id === post.user_id

  useEffect(() => { fetchMessages() }, [])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('lost_and_found_messages')
      .select('*, profiles!lost_and_found_messages_sender_id_fkey(name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    await supabase.from('lost_and_found_messages').insert([{ post_id: post.id, sender_id: user.id, message: newMessage.trim() }])
    setNewMessage('')
    await fetchMessages()
    setSending(false)
  }

  const images = post.images || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4 py-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{post.title}</h2>
            <p className="text-sm text-gray-500">{post.profiles?.name} • {getDaysAgo(post.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        {images.length > 0 && (
          <div className="relative">
            <img src={images[activeImage].image_url} alt={post.title} className={`w-full h-56 object-cover ${post.status === 'found' ? 'grayscale' : ''}`} />
            {post.status === 'found' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-green-500 text-white font-bold text-xl px-6 py-3 rounded-full shadow">FOUND! 🎉</span>
              </div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg">‹</button>
                <button onClick={() => setActiveImage((activeImage + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg">›</button>
              </>
            )}
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{post.category}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${post.status === 'found' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {post.status === 'found' ? '✅ Found' : '😟 Lost'}
            </span>
          </div>

          {post.description && <p className="text-gray-700 text-sm">{post.description}</p>}

          {isOwner && post.status === 'lost' && (
            <button onClick={onMarkFound} className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 transition text-sm">✅ Mark as Found</button>
          )}

          {/* Messages */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">💬 Messages ({messages.length})</h3>
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No messages yet. Be the first to reach out!</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.sender_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="font-semibold text-xs opacity-70 mb-0.5">{msg.profiles?.name}</p>
                      <p>{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {post.status === 'lost' && (
              <form onSubmit={sendMessage} className="flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 px-3 py-2 border rounded-xl text-sm" placeholder="Send a message..." />
                <button type="submit" disabled={sending} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Send</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── EVENTS ──────────────────────────────────────────────────────────────────

function Events({ user }) {
  const [events, setEvents] = useState([])
  const [pastEvents, setPastEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    // Mark all current events as seen
    const markAsSeen = async () => {
      const { data } = await supabase.from('events').select('id').eq('status', 'approved').gt('start_date', new Date().toISOString())
      if (data) {
        const ids = data.map(e => e.id)
        localStorage.setItem('seenEvents', JSON.stringify(ids))
      }
    }
    markAsSeen()
  }, [])

  const fetchEvents = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles!events_user_id_fkey(name, email)')
        .eq('status', 'approved')
        .order('start_date', { ascending: true })
      if (error) throw error
      setEvents((data || []).filter(e => e.start_date >= now))
      setPastEvents((data || []).filter(e => e.start_date < now))
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">🎉 Campus Events</h2>
          <p className="text-gray-500 text-sm mt-1">Unlike Sidechat, events posted here stay visible and are easy to find — not lost in a feed.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition text-sm">+ Post Event</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { key: 'upcoming', label: `📅 Upcoming (${events.length})` },
          { key: 'past', label: `📁 Past (${pastEvents.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'upcoming' && (
        events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-gray-500">No upcoming events yet. Be the first to post one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(event => (
              <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
            ))}
          </div>
        )
      )}

      {activeTab === 'past' && (
        pastEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No past events yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75">
            {pastEvents.map(event => (
              <EventCard key={event.id} event={event} past onClick={() => setSelectedEvent(event)} />
            ))}
          </div>
        )
      )}

      {showCreate && (
        <CreateEventModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchEvents() }}
        />
      )}

      {selectedEvent && (
        <ViewEventModal event={selectedEvent} user={user} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  )
}

function EventCard({ event, onClick, past }) {
  const date = new Date(event.start_date)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer ${past ? 'grayscale opacity-75' : ''}`} onClick={onClick}>
      <img src={event.flyer_url} alt={event.title} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg mb-1">{event.title}</h3>
        <p className="text-blue-600 font-medium text-sm mb-1">📅 {dateStr} at {timeStr}</p>
        <p className="text-gray-500 text-sm mb-2">📍 {event.location}</p>
        {event.description && <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>}
        <p className="text-xs text-gray-400 mt-3">Posted by {event.profiles?.name}</p>
      </div>
    </div>
  )
}

function CreateEventModal({ user, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [flyer, setFlyer] = useState(null)
  const [flyerPreview, setFlyerPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [agreedToRules, setAgreedToRules] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agreedToRules) { setMessage('Please agree to the posting rules.'); return }
    if (!flyer) { setMessage('Please upload an event flyer.'); return }
    setSaving(true)
    try {
      // Upload flyer
      const ext = flyer.name.split('.').pop()
      const fileName = `event-${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(fileName, flyer)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(fileName)

      const startDateTime = new Date(`${startDate}T${startTime}`).toISOString()

      await supabase.from('events').insert([{
        user_id: user.id,
        title,
        description,
        location,
        start_date: startDateTime,
        flyer_url: publicUrl,
        status: 'pending'
      }])

      onCreated()
      alert('Event submitted for review! It will appear once approved. Usually within 24 hours 💙')
    } catch (error) {
      setMessage('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-1">🎉 Post an Event</h2>
        <p className="text-gray-500 text-sm mb-6">Events are reviewed before going live — usually within 24 hours.</p>

        {/* Rules */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm">
          <p className="font-bold text-yellow-800 mb-2">📋 Posting Rules</p>
          <ul className="text-yellow-700 space-y-1 list-disc list-inside">
            <li>Event must be open to the broader Wellesley student community</li>
            <li>No events where alcohol consumption is the primary activity</li>
            <li>No events that violate Wellesley's Honor Code or student policies</li>
            <li>No misleading or false event information</li>
            <li>The platform is not responsible for events posted by students</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Event Name *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Spring Cultural Show" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location *</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} required className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Alumnae Hall, Pendleton West 212" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full px-3 py-2 border rounded-md" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows="3" placeholder="Tell people what the event is about..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Event Flyer * <span className="text-gray-400 font-normal">(required)</span></label>
            <input type="file" accept="image/*" onChange={e => { setFlyer(e.target.files[0]); setFlyerPreview(URL.createObjectURL(e.target.files[0])) }} required className="w-full px-3 py-2 border rounded-md text-sm" />
            {flyerPreview && <img src={flyerPreview} alt="flyer preview" className="mt-2 w-full h-40 object-cover rounded-xl border" />}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreedToRules} onChange={e => setAgreedToRules(e.target.checked)} className="w-4 h-4 mt-0.5" />
            <span className="text-sm text-gray-600">I confirm this event follows the posting rules above and is open to the Wellesley student community.</span>
          </label>

          {message && <p className="text-red-600 text-sm">{message}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">{saving ? 'Submitting...' : 'Submit for Review'}</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ViewEventModal({ event, user, onClose }) {
  const date = new Date(event.start_date)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4 py-8" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start p-6 border-b">
          <h2 className="text-xl font-bold pr-4">{event.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <img src={event.flyer_url} alt={event.title} className="w-full h-64 object-cover" />
        <div className="p-6 space-y-3">
          <p className="text-blue-600 font-semibold">📅 {dateStr} at {timeStr}</p>
          <p className="text-gray-700">📍 {event.location}</p>
          {event.description && <p className="text-gray-600">{event.description}</p>}
          <p className="text-xs text-gray-400 pt-2 border-t">Posted by {event.profiles?.name}</p>
        </div>
      </div>
    </div>
  )
}
