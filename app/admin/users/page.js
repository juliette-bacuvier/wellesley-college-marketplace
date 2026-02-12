'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UserManagement() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all, active, banned
  const [selectedUser, setSelectedUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const { data: adminData } = await supabase.from('admins').select('*').eq('user_id', user.id).single()
      if (!adminData) {
        alert('Access denied.')
        router.push('/')
        return
      }
      setIsAdmin(true)
      await fetchUsers()
    } catch (error) {
      console.error('Error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      // Get listing counts for each user
      const usersWithStats = await Promise.all((data || []).map(async (u) => {
        const { data: listings } = await supabase.from('listings').select('id, is_sold').eq('user_id', u.id)
        const { data: purchases } = await supabase.from('listings').select('id').eq('buyer_id', u.id).eq('is_sold', true)
        return {
          ...u,
          listingCount: listings?.length || 0,
          soldCount: listings?.filter(l => l.is_sold).length || 0,
          purchaseCount: purchases?.length || 0
        }
      }))
      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const banUser = async (userId, reason) => {
    if (!reason.trim()) {
      alert('Please provide a reason for banning')
      return
    }
    try {
      await supabase.from('profiles').update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason
      }).eq('id', userId)

      await supabase.from('admin_activity_log').insert([{
        admin_id: user.id,
        action: 'ban_user',
        target_type: 'user',
        target_id: userId,
        details: { reason }
      }])

      alert('User banned')
      await fetchUsers()
      setSelectedUser(null)
    } catch (error) {
      console.error('Error banning user:', error)
      alert('Failed to ban user')
    }
  }

  const unbanUser = async (userId) => {
    try {
      await supabase.from('profiles').update({
        is_banned: false,
        banned_at: null,
        banned_reason: null
      }).eq('id', userId)

      await supabase.from('admin_activity_log').insert([{
        admin_id: user.id,
        action: 'unban_user',
        target_type: 'user',
        target_id: userId
      }])

      alert('User unbanned')
      await fetchUsers()
    } catch (error) {
      console.error('Error unbanning user:', error)
    }
  }

  const deleteUserListings = async (userId) => {
    if (!confirm('⚠️ Delete ALL listings from this user? This cannot be undone!')) return
    try {
      await supabase.from('listings').delete().eq('user_id', userId)
      await supabase.from('admin_activity_log').insert([{
        admin_id: user.id,
        action: 'delete_user_listings',
        target_type: 'user',
        target_id: userId
      }])
      alert('All listings deleted')
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting listings:', error)
    }
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || (filterStatus === 'banned' ? u.is_banned : !u.is_banned)
    return matchesSearch && matchesFilter
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center">Access Denied</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">👥 User Management</h1>
          <Link href="/admin" className="text-gray-600 hover:text-gray-900 text-sm">← Back to Admin</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-md"
          />
          <div className="flex gap-2">
            {['all', 'active', 'banned'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterStatus === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f === 'all' ? 'All Users' : f === 'active' ? 'Active' : 'Banned'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{users.length}</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{users.filter(u => !u.is_banned).length}</p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{users.filter(u => u.is_banned).length}</p>
            <p className="text-sm text-gray-600">Banned</p>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">User</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Class Year</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Listings</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Sold</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Purchased</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Joined</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{u.class_year || '—'}</td>
                  <td className="px-4 py-3 text-sm">{u.listingCount}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{u.soldCount}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">{u.purchaseCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.is_banned ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Banned</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedUser(u)} className="text-blue-600 hover:underline text-sm">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User detail modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onBan={banUser}
            onUnban={unbanUser}
            onDeleteListings={deleteUserListings}
          />
        )}
      </main>
    </div>
  )
}

function UserDetailModal({ user, onClose, onBan, onUnban, onDeleteListings }) {
  const [banReason, setBanReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Class Year</p>
              <p className="font-medium">{user.class_year || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Dorm</p>
              <p className="font-medium">{user.dorm || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Listings</p>
              <p className="font-medium">{user.listingCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Items Sold</p>
              <p className="font-medium text-green-600">{user.soldCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Purchases</p>
              <p className="font-medium text-blue-600">{user.purchaseCount}</p>
            </div>
            <div>
              <p className="text-gray-500">Joined</p>
              <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {user.is_banned && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-bold text-sm mb-1">⛔ Banned</p>
              <p className="text-red-700 text-sm">Reason: {user.banned_reason}</p>
              <p className="text-red-600 text-xs mt-1">Banned on: {new Date(user.banned_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t pt-6">
          {!user.is_banned ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Ban Reason</label>
                <textarea value={banReason} onChange={e => setBanReason(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" rows="2" placeholder="Reason for banning this user..." />
              </div>
              <button onClick={() => { onBan(user.id, banReason); setBanReason('') }} className="w-full bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700">⛔ Ban User</button>
            </>
          ) : (
            <button onClick={() => onUnban(user.id)} className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700">✅ Unban User</button>
          )}
          <button onClick={() => onDeleteListings(user.id)} className="w-full bg-orange-600 text-white py-2 rounded-xl font-semibold hover:bg-orange-700">🗑️ Delete All Listings</button>
        </div>
      </div>
    </div>
  )
}
