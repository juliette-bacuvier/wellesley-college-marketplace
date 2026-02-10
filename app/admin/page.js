'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    type: 'info'
  })
  const router = useRouter()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      setUser(user)

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!adminData) {
        alert('Access denied. Admin privileges required.')
        router.push('/')
        return
      }

      setIsAdmin(true)
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const createAnnouncement = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          ...newAnnouncement,
          created_by: user.id
        }])

      if (error) throw error

      alert('Announcement created!')
      setNewAnnouncement({ title: '', message: '', type: 'info' })
      setShowCreateForm(false)
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error creating announcement:', error)
      alert('Failed to create announcement')
    }
  }

  const toggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error toggling announcement:', error)
      alert('Failed to update announcement')
    }
  }

  const deleteAnnouncement = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert('Failed to delete announcement')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Access Denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">⭐ Admin Dashboard</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold">Announcements</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : '+ New Announcement'}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Create New Announcement</h3>
            <form onSubmit={createAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Scheduled Maintenance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message *</label>
                <textarea
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                  placeholder="Announcement details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="maintenance">Maintenance (Red)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
              >
                Create Announcement
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-gray-600">No announcements yet.</p>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {announcement.title}
                      <span className={`ml-3 text-xs px-2 py-1 rounded ${
                        announcement.type === 'info' ? 'bg-blue-100 text-blue-800' :
                        announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {announcement.type.toUpperCase()}
                      </span>
                      {announcement.is_active ? (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ACTIVE</span>
                      ) : (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">INACTIVE</span>
                      )}
                    </h3>
                    <p className="text-gray-700 mb-2">{announcement.message}</p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => toggleActive(announcement.id, announcement.is_active)}
                    className={`px-4 py-2 rounded-md ${
                      announcement.is_active 
                        ? 'bg-gray-600 text-white hover:bg-gray-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {announcement.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <a 
            href="https://buymeacoffee.com/jbacuvier" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            ☕ Buy me a coffee!
          </a>
        </div>
      </footer>
    </div>
  )
}
