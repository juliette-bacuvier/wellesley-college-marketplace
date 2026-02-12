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
  const [reports, setReports] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [analytics, setAnalytics] = useState({
    totalListings: 0,
    totalUsers: 0,
    totalSold: 0,
    totalFree: 0,
    totalOffers: 0,
    totalMessages: 0,
    mostLikedListings: [],
    mostActiveDorms: [],
    categoryBreakdown: []
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
      await fetchAnalytics()
      await fetchReports()
      await fetchPendingEvents()
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      // Total listings
      const { count: totalListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Total sold
      const { count: totalSold } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_sold', true)

      // Total free
      const { count: totalFree } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_free', true)

      // Total offers
      const { count: totalOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })

      // Total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })

      // Most liked listings
      const { data: likes } = await supabase
        .from('likes')
        .select('listing_id')

      const likeCounts = {}
      likes?.forEach(like => {
        likeCounts[like.listing_id] = (likeCounts[like.listing_id] || 0) + 1
      })

      const topListingIds = Object.entries(likeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id)

      let mostLikedListings = []
      if (topListingIds.length > 0) {
        const { data: topListings } = await supabase
          .from('listings')
          .select('id, title, price, is_free')
          .in('id', topListingIds)

        mostLikedListings = topListings?.map(l => ({
          ...l,
          likes: likeCounts[l.id] || 0
        })).sort((a, b) => b.likes - a.likes) || []
      }

      // Most active dorms
      const { data: allListings } = await supabase
        .from('listings')
        .select('dorm')

      const dormCounts = {}
      allListings?.forEach(l => {
        if (l.dorm) dormCounts[l.dorm] = (dormCounts[l.dorm] || 0) + 1
      })

      const mostActiveDorms = Object.entries(dormCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([dorm, count]) => ({ dorm, count }))

      // Category breakdown
      const categoryCounts = {}
      allListings?.forEach(l => {
        if (l.category) categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1
      })

      const categoryBreakdown = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => ({ category, count }))

      setAnalytics({
        totalListings: totalListings || 0,
        totalUsers: totalUsers || 0,
        totalSold: totalSold || 0,
        totalFree: totalFree || 0,
        totalOffers: totalOffers || 0,
        totalMessages: totalMessages || 0,
        mostLikedListings,
        mostActiveDorms,
        categoryBreakdown
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const fetchPendingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles!events_user_id_fkey(name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      setPendingEvents(data || [])
    } catch (error) {
      console.error('Error fetching pending events:', error)
    }
  }

  const approveEvent = async (id) => {
    await supabase.from('events').update({ status: 'approved' }).eq('id', id)
    setPendingEvents(pendingEvents.filter(e => e.id !== id))
  }

  const rejectEvent = async (id) => {
    await supabase.from('events').update({ status: 'rejected' }).eq('id', id)
    setPendingEvents(pendingEvents.filter(e => e.id !== id))
  }

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          listings(id, title),
          profiles!reports_reporter_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  const dismissReport = async (id) => {
    try {
      await supabase.from('reports').delete().eq('id', id)
      setReports(reports.filter(r => r.id !== id))
    } catch (error) {
      console.error('Error dismissing report:', error)
    }
  }

  const deleteReportedListing = async (listingId, reportId) => {
    if (!confirm('⚠️ Are you sure you want to delete this listing? This cannot be undone!')) return
    try {
      await supabase.from('listings').delete().eq('id', listingId)
      await supabase.from('reports').delete().eq('id', reportId)
      setReports(reports.filter(r => r.id !== reportId))
      alert('Listing deleted.')
    } catch (error) {
      console.error('Error deleting listing:', error)
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/analytics" className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:shadow-xl transition group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">📊 Analytics</h3>
                <p className="text-blue-100 text-sm">Detailed insights & reports</p>
              </div>
              <span className="text-4xl group-hover:scale-110 transition">→</span>
            </div>
          </Link>
          <Link href="/admin/users" className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:shadow-xl transition group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">👥 Users</h3>
                <p className="text-purple-100 text-sm">Manage & moderate users</p>
              </div>
              <span className="text-4xl group-hover:scale-110 transition">→</span>
            </div>
          </Link>
        </div>


        {/* Analytics Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">📊 Analytics</h2>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{analytics.totalListings}</p>
              <p className="text-sm text-gray-600 mt-1">Total Listings</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{analytics.totalUsers}</p>
              <p className="text-sm text-gray-600 mt-1">Total Users</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{analytics.totalSold}</p>
              <p className="text-sm text-gray-600 mt-1">Items Sold</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{analytics.totalFree}</p>
              <p className="text-sm text-gray-600 mt-1">Free Items</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{analytics.totalOffers}</p>
              <p className="text-sm text-gray-600 mt-1">Total Offers</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-pink-600">{analytics.totalMessages}</p>
              <p className="text-sm text-gray-600 mt-1">Total Messages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Most Liked */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold mb-3">❤️ Most Liked Items</h3>
              {analytics.mostLikedListings.length === 0 ? (
                <p className="text-gray-500 text-sm">No likes yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.mostLikedListings.map((listing, i) => (
                    <div key={listing.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 truncate flex-1">
                        {i + 1}. {listing.title}
                      </span>
                      <span className="text-pink-600 font-bold ml-2">❤️ {listing.likes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Active Dorms */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold mb-3">🏠 Most Active Dorms</h3>
              {analytics.mostActiveDorms.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.mostActiveDorms.map((item, i) => (
                    <div key={item.dorm} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{i + 1}. {item.dorm}</span>
                      <span className="text-blue-600 font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-bold mb-3">🗂️ Categories</h3>
              {analytics.categoryBreakdown.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {analytics.categoryBreakdown.map((item) => (
                    <div key={item.category} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="text-green-600 font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pending Events Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">🎉 Pending Events {pendingEvents.length > 0 && <span className="ml-2 text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{pendingEvents.length} pending</span>}</h2>
          {pendingEvents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">✅ No events pending review!</div>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map(event => {
                const date = new Date(event.start_date)
                return (
                  <div key={event.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
                    <div className="flex gap-4">
                      <img src={event.flyer_url} alt={event.title} className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{event.title}</h3>
                        <p className="text-sm text-gray-500">📅 {date.toLocaleDateString()} at {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                        <p className="text-sm text-gray-500">📍 {event.location}</p>
                        <p className="text-sm text-gray-500">Posted by: {event.profiles?.name} ({event.profiles?.email})</p>
                        {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <button onClick={() => approveEvent(event.id)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm">✅ Approve</button>
                      <button onClick={() => rejectEvent(event.id)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm">❌ Reject</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Reports Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">🚩 Reports {reports.length > 0 && <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">{reports.length} pending</span>}</h2>
          {reports.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              ✅ No reports to review!
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-400">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">
                        {report.listings?.title || 'Deleted listing'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Reported by: {report.profiles?.name} ({report.profiles?.email})
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-red-800">Reason: {report.reason}</p>
                    {report.details && <p className="text-sm text-red-700 mt-1">Details: {report.details}</p>}
                  </div>
                  <div className="flex gap-2">
                    {report.listings?.id && (
                      <>
                        <Link href={`/listing/${report.listings.id}`} target="_blank" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                          View Listing
                        </Link>
                        <button onClick={() => deleteReportedListing(report.listings.id, report.id)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm">
                          Delete Listing
                        </button>
                      </>
                    )}
                    <button onClick={() => dismissReport(report.id)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm">
                      Dismiss Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Announcements Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">📢 Announcements</h2>
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
                    <option value="info">ℹ️ Info (Blue)</option>
                    <option value="warning">⚠️ Warning (Yellow)</option>
                    <option value="maintenance">🔧 Maintenance (Red)</option>
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
        </section>
      </main>

            <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            ☕ Buy me a coffee!
          </a>
        </div>
      </footer>
    </div>
  )
}
