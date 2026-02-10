'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setAnnouncements(data || [])
      setLoading(false)

      // Mark all as read in localStorage
      if (data && data.length > 0) {
        const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
        const allIds = data.map(a => a.id)
        const merged = [...new Set([...readIds, ...allIds])]
        localStorage.setItem('readAnnouncements', JSON.stringify(merged))
        window.dispatchEvent(new Event('announcementsRead'))
      }
    }
    fetchAnnouncements()
  }, [])

  const getAnnouncementStyle = (type) => {
    switch(type) {
      case 'warning': return 'border-yellow-400 bg-yellow-50'
      case 'maintenance': return 'border-red-400 bg-red-50'
      default: return 'border-blue-400 bg-blue-50'
    }
  }

  const getAnnouncementIcon = (type) => {
    switch(type) {
      case 'warning': return '⚠️'
      case 'maintenance': return '🔧'
      default: return '📢'
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Marketplace</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">📢 Announcements</h1>
        <p className="text-gray-500 mb-8">Updates and news from the Wellesley Marketplace team.</p>

        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500">No announcements yet. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className={`border-l-4 rounded-xl shadow-sm p-6 ${getAnnouncementStyle(a.type)}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getAnnouncementIcon(a.type)}</span>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold mb-1">{a.title}</h2>
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{a.message}</p>
                    <p className="text-xs text-gray-400">{formatDate(a.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">☕ Buy me a coffee!</a>
        </div>
      </footer>
    </div>
  )
}
