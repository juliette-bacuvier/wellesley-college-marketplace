'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminAnalytics() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('week') // week, month, year
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    listingActivity: [],
    categoryBreakdown: [],
    transactionMetrics: {},
    engagement: {},
    lostFoundStats: {},
    eventStats: {},
    topSellers: [],
    topBuyers: [],
    recentActivity: [],
    storageUsage: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  useEffect(() => {
    if (isAdmin) fetchAnalytics()
  }, [isAdmin, timeframe])

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      const { data: adminData } = await supabase.from('admins').select('*').eq('user_id', user.id).single()
      if (!adminData) {
        alert('Access denied. Admin privileges required.')
        router.push('/')
        return
      }
      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const now = new Date()
      let startDate = new Date()
      
      if (timeframe === 'week') startDate.setDate(now.getDate() - 7)
      else if (timeframe === 'month') startDate.setMonth(now.getMonth() - 1)
      else if (timeframe === 'year') startDate.setFullYear(now.getFullYear() - 1)

      const start = startDate.toISOString()

      // User growth
      const { data: users } = await supabase.from('profiles').select('created_at').gte('created_at', start).order('created_at')
      const userGrowth = aggregateByDay(users || [], 'created_at')

      // Listing activity
      const { data: listings } = await supabase.from('listings').select('created_at, category').gte('created_at', start)
      const listingActivity = aggregateByDay(listings || [], 'created_at')

      // Category breakdown
      const categoryCounts = {}
      listings?.forEach(l => {
        categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1
      })
      const categoryBreakdown = Object.entries(categoryCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)

      // Transaction metrics
      const { data: offers } = await supabase.from('offers').select('*').gte('created_at', start)
      const acceptedOffers = offers?.filter(o => o.status === 'accepted') || []
      const transactionMetrics = {
        totalOffers: offers?.length || 0,
        acceptedOffers: acceptedOffers.length,
        acceptanceRate: offers?.length ? ((acceptedOffers.length / offers.length) * 100).toFixed(1) : 0,
        avgOfferAmount: acceptedOffers.length ? (acceptedOffers.reduce((sum, o) => sum + o.amount, 0) / acceptedOffers.length).toFixed(2) : 0
      }

      // Engagement
      const { data: messages } = await supabase.from('messages').select('id').gte('created_at', start)
      const { data: likes } = await supabase.from('likes').select('id').gte('created_at', start)
      const { data: activeUsers } = await supabase.from('profiles').select('id, updated_at').gte('updated_at', start)
      const engagement = {
        totalMessages: messages?.length || 0,
        totalLikes: likes?.length || 0,
        activeUsers: activeUsers?.length || 0
      }

      // Lost & Found stats
      const { data: laf } = await supabase.from('lost_and_found').select('status').gte('created_at', start)
      const lostFoundStats = {
        total: laf?.length || 0,
        found: laf?.filter(l => l.status === 'found').length || 0,
        foundRate: laf?.length ? ((laf.filter(l => l.status === 'found').length / laf.length) * 100).toFixed(1) : 0
      }

      // Event stats
      const { data: events } = await supabase.from('events').select('status').gte('created_at', start)
      const eventStats = {
        total: events?.length || 0,
        approved: events?.filter(e => e.status === 'approved').length || 0,
        pending: events?.filter(e => e.status === 'pending').length || 0,
        rejected: events?.filter(e => e.status === 'rejected').length || 0
      }

      // Top sellers
      const { data: soldListings } = await supabase.from('listings').select('user_id, price, buyer_id').eq('is_sold', true).gte('updated_at', start)
      const sellerMap = {}
      soldListings?.forEach(l => {
        if (!sellerMap[l.user_id]) sellerMap[l.user_id] = { count: 0, revenue: 0 }
        sellerMap[l.user_id].count++
        sellerMap[l.user_id].revenue += l.price
      })
      const topSellersData = await Promise.all(
        Object.entries(sellerMap).sort(([,a], [,b]) => b.count - a.count).slice(0, 5).map(async ([userId, stats]) => {
          const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', userId).single()
          return { ...profile, ...stats }
        })
      )

      // Top buyers
      const buyerMap = {}
      soldListings?.forEach(l => {
        if (l.buyer_id) {
          buyerMap[l.buyer_id] = (buyerMap[l.buyer_id] || 0) + 1
        }
      })
      const topBuyersData = await Promise.all(
        Object.entries(buyerMap).sort(([,a], [,b]) => b - a).slice(0, 5).map(async ([userId, count]) => {
          const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', userId).single()
          return { ...profile, count }
        })
      )

      // Storage usage (count images)
      const { data: allImages } = await supabase.from('listing_images').select('id')
      const storageUsage = allImages?.length || 0

      setAnalytics({
        userGrowth,
        listingActivity,
        categoryBreakdown,
        transactionMetrics,
        engagement,
        lostFoundStats,
        eventStats,
        topSellers: topSellersData,
        topBuyers: topBuyersData,
        storageUsage
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const aggregateByDay = (data, dateField) => {
    const counts = {}
    data.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0]
      counts[date] = (counts[date] || 0) + 1
    })
    return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center">Access Denied</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">📊 Analytics Dashboard</h1>
          <div className="flex gap-3">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900 text-sm">← Back to Admin</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Timeframe selector */}
        <div className="flex gap-2 bg-white rounded-xl shadow-sm p-1 w-fit">
          {['week', 'month', 'year'].map(t => (
            <button key={t} onClick={() => setTimeframe(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${timeframe === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t === 'week' ? 'Last 7 Days' : t === 'month' ? 'Last 30 Days' : 'Last Year'}
            </button>
          ))}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Active Users" value={analytics.engagement.activeUsers} icon="👥" color="blue" />
          <MetricCard title="Total Listings" value={analytics.listingActivity.reduce((sum, d) => sum + d.count, 0)} icon="🛍️" color="green" />
          <MetricCard title="Acceptance Rate" value={`${analytics.transactionMetrics.acceptanceRate}%`} icon="✅" color="purple" />
          <MetricCard title="Images Uploaded" value={analytics.storageUsage} icon="📷" color="pink" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User growth */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">👥 User Growth</h3>
            <SimpleLineChart data={analytics.userGrowth} />
          </div>

          {/* Listing activity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">📦 Listing Activity</h3>
            <SimpleLineChart data={analytics.listingActivity} />
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">🗂️ Popular Categories</h3>
            {analytics.categoryBreakdown.slice(0, 8).map(cat => (
              <div key={cat.category} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm text-gray-700">{cat.category}</span>
                <span className="text-sm font-bold text-blue-600">{cat.count}</span>
              </div>
            ))}
          </div>

          {/* Transaction metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">💰 Transaction Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Offers</span>
                <span className="font-bold">{analytics.transactionMetrics.totalOffers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accepted</span>
                <span className="font-bold text-green-600">{analytics.transactionMetrics.acceptedOffers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Acceptance Rate</span>
                <span className="font-bold text-purple-600">{analytics.transactionMetrics.acceptanceRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Offer Amount</span>
                <span className="font-bold text-blue-600">${analytics.transactionMetrics.avgOfferAmount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Community stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">🔍 Lost & Found</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Posted</span>
                <span className="font-bold">{analytics.lostFoundStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items Found</span>
                <span className="font-bold text-green-600">{analytics.lostFoundStats.found}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-bold text-blue-600">{analytics.lostFoundStats.foundRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">🎉 Events</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Submitted</span>
                <span className="font-bold">{analytics.eventStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Approved</span>
                <span className="font-bold text-green-600">{analytics.eventStats.approved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-bold text-yellow-600">{analytics.eventStats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rejected</span>
                <span className="font-bold text-red-600">{analytics.eventStats.rejected}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">🏆 Top Sellers</h3>
            {analytics.topSellers.length === 0 ? (
              <p className="text-gray-500 text-sm">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topSellers.map((seller, i) => (
                  <div key={seller.email} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{i + 1}. {seller.name}</p>
                      <p className="text-xs text-gray-400">{seller.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">${seller.revenue.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{seller.count} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">🛒 Top Buyers</h3>
            {analytics.topBuyers.length === 0 ? (
              <p className="text-gray-500 text-sm">No purchases yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topBuyers.map((buyer, i) => (
                  <div key={buyer.email} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{i + 1}. {buyer.name}</p>
                      <p className="text-xs text-gray-400">{buyer.email}</p>
                    </div>
                    <p className="text-sm font-bold text-blue-600">{buyer.count} purchased</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ title, value, icon, color }) {
  const colors = {
    blue: 'border-blue-500 bg-blue-50',
    green: 'border-green-500 bg-green-50',
    purple: 'border-purple-500 bg-purple-50',
    pink: 'border-pink-500 bg-pink-50'
  }
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-t-4 ${colors[color]}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-gray-600 text-sm">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SimpleLineChart({ data }) {
  if (data.length === 0) return <p className="text-gray-500 text-sm">No data yet</p>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.date} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-20">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${(d.count / max) * 100}%` }}>
              <span className="text-white text-xs font-bold">{d.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
