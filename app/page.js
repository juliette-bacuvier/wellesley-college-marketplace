'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import OnboardingModal from './components/OnboardingModal'
import ProfileSetupModal from './components/ProfileSetupModal'

export default function Home() {
  const [listings, setListings] = useState([])
  const [filteredListings, setFilteredListings] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedDorm, setSelectedDorm] = useState('')
  const [showSold, setShowSold] = useState(true)
  const [showFreeOnly, setShowFreeOnly] = useState(false)
  const [sortBy, setSortBy] = useState('default')
  const [userLikes, setUserLikes] = useState(new Set())
  const [likeCounts, setLikeCounts] = useState({})
  const [likedCount, setLikedCount] = useState(0)
  const [pendingOffersCount, setPendingOffersCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [adminIds, setAdminIds] = useState(new Set())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const router = useRouter()

  const categories = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Kitchen & Appliances', 'Decor', 'Sports & Fitness', 'Other']
  const dorms = ['Cazenove', 'Shafer', 'Pomeroy', 'Beebe', 'Tower Court East', 'Tower Court West', 'Severance', 'Claflin', 'Lake House', 'Casa Cervantes', 'French House', 'Stone Davis', 'Bates', 'McAfee', 'Freeman', 'Munger']

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchUserLikes(user.id)
        fetchPendingOffers(user.id)
        fetchUnreadMessages(user.id)
        checkAdminStatus(user.id)
        checkOnboarding(user.id)
        checkProfileSetup(user.id)
      }
      setLoading(false)
    })
    fetchListings()
    fetchLikeCounts()
    autoArchiveOldListings()
    fetchAnnouncements()
    fetchAdmins()
  }, [])

  useEffect(() => {
    filterAndSortListings()
  }, [listings, searchTerm, selectedCategory, selectedDorm, showSold, showFreeOnly, sortBy])

  const checkAdminStatus = async (userId) => {
    try {
      const { data } = await supabase.from('admins').select('*').eq('user_id', userId).single()
      setIsAdmin(!!data)
    } catch (error) {
      setIsAdmin(false)
    }
  }

  const checkOnboarding = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('has_seen_onboarding')
        .eq('id', userId)
        .single()
      if (data && !data.has_seen_onboarding) {
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error('Error checking onboarding:', error)
    }
  }

  const checkProfileSetup = async (userId) => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('setup') !== 'true') return
      const { data } = await supabase.from('profiles').select('name, class_year').eq('id', userId).single()
      if (!data?.name || !data?.class_year) {
        setShowProfileSetup(true)
      }
      // Clean URL
      window.history.replaceState({}, '', '/')
    } catch (error) {
      console.error('Error checking profile setup:', error)
    }
  }

  const completeOnboarding = async () => {
    setShowOnboarding(false)
    if (user) {
      await supabase
        .from('profiles')
        .update({ has_seen_onboarding: true })
        .eq('id', user.id)
    }
  }

  const fetchAdmins = async () => {
    try {
      const { data } = await supabase.from('admins').select('user_id')
      if (data) setAdminIds(new Set(data.map(a => a.user_id)))
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const { data } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
      setAnnouncements(data || [])
      calculateUnreadAnnouncements(data || [])
      calculateUnreadAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  const calculateUnreadAnnouncements = (announcements) => {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]')
    const unread = announcements.filter(a => !readIds.includes(a.id))
    setUnreadAnnouncementsCount(unread.length)
  }

  const fetchPendingOffers = async (userId) => {
    try {
      const { data: userListings } = await supabase.from('listings').select('id').eq('user_id', userId)
      if (!userListings || userListings.length === 0) return
      const listingIds = userListings.map(l => l.id)
      const { data: offers } = await supabase.from('offers').select('id').in('listing_id', listingIds).eq('status', 'pending').eq('offered_by', 'buyer')
      setPendingOffersCount(offers?.length || 0)
    } catch (error) {
      console.error('Error fetching pending offers:', error)
    }
  }

  const fetchUnreadMessages = async (userId) => {
    try {
      const { data: convos } = await supabase.from('conversations').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      if (!convos || convos.length === 0) return
      const convoIds = convos.map(c => c.id)
      const { data: unread } = await supabase.from('messages').select('id').in('conversation_id', convoIds).eq('is_read', false).neq('sender_id', userId)
      setUnreadMessagesCount(unread?.length || 0)
    } catch (error) {
      console.error('Error fetching unread messages:', error)
    }
  }

  const calculateYearLevel = (classYear, graduationTerm) => {
    if (classYear === 'Exchange') return { level: 'Exchange Student', priority: 1 }
    if (classYear === 'Graduate') return { level: 'Graduate Student', priority: 5 }
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const gradYear = parseInt(classYear)
    if (isNaN(gradYear)) return { level: '', priority: 6 }
    let yearsUntilGrad = gradYear - currentYear
    if (graduationTerm === 'Winter') { if (currentMonth >= 8) yearsUntilGrad -= 0.5 }
    else if (graduationTerm === 'Spring') { if (currentMonth >= 5) yearsUntilGrad -= 1 }
    if (yearsUntilGrad <= 0.5) return { level: 'Senior', priority: 1 }
    else if (yearsUntilGrad <= 1.5) return { level: 'Junior', priority: 2 }
    else if (yearsUntilGrad <= 2.5) return { level: 'Sophomore', priority: 3 }
    else return { level: 'Freshman', priority: 4 }
  }

  const getYearLevelBadge = (classYear, graduationTerm) => {
    const { level } = calculateYearLevel(classYear, graduationTerm)
    const styles = {
      'Senior': 'bg-red-600 text-white',
      'Exchange Student': 'bg-red-600 text-white',
      'Junior': 'bg-orange-500 text-white',
      'Sophomore': 'bg-yellow-500 text-white',
      'Freshman': 'bg-green-600 text-white',
      'Graduate Student': 'bg-gray-500 text-white'
    }
    return level ? (
      <div className={`absolute top-2 left-2 ${styles[level]} text-xs font-bold px-2 py-1 rounded z-10`}>
        {level.toUpperCase()}
      </div>
    ) : null
  }

  const getConditionStyle = (condition) => {
    switch(condition) {
      case 'new': return 'bg-green-100 text-green-800'
      case 'like_new': return 'bg-green-100 text-green-700'
      case 'good': return 'bg-yellow-100 text-yellow-800'
      case 'fair': return 'bg-orange-100 text-orange-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConditionLabel = (condition) => {
    switch(condition) {
      case 'new': return 'New'
      case 'like_new': return 'Like New'
      case 'good': return 'Good'
      case 'fair': return 'Fair'
      case 'poor': return 'Poor'
      default: return condition
    }
  }

  const autoArchiveOldListings = async () => {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      await supabase.from('listings').update({ is_archived: true }).lt('created_at', oneYearAgo.toISOString()).eq('is_archived', false)
    } catch (error) {
      console.error('Error auto-archiving:', error)
    }
  }

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase.from('listings').select('*').eq('is_archived', false).eq('is_draft', false).order('created_at', { ascending: false })
      if (error) throw error
      const listingsWithProfiles = await Promise.all((data || []).map(async (listing) => {
        const { data: profile } = await supabase.from('profiles').select('name, email, phone, class_year, graduation_term').eq('id', listing.user_id).single()
        const { data: images } = await supabase.from('listing_images').select('image_url').eq('listing_id', listing.id).order('display_order', { ascending: true }).limit(1)
        return { ...listing, profiles: profile, extra_images: images || [] }
      }))
      setListings(listingsWithProfiles)
    } catch (error) {
      console.error('Error fetching listings:', error)
    }
  }

  const fetchUserLikes = async (userId) => {
    try {
      const { data, error } = await supabase.from('likes').select('listing_id').eq('user_id', userId)
      if (error) throw error
      setUserLikes(new Set(data.map(like => like.listing_id)))
      setLikedCount(data.length)
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }

  const fetchLikeCounts = async () => {
    try {
      const { data, error } = await supabase.from('likes').select('listing_id')
      if (error) throw error
      const counts = {}
      data.forEach(like => { counts[like.listing_id] = (counts[like.listing_id] || 0) + 1 })
      setLikeCounts(counts)
    } catch (error) {
      console.error('Error fetching like counts:', error)
    }
  }

  const filterAndSortListings = () => {
    let filtered = listings
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    filtered = filtered.filter(l => {
      if (l.is_sold) {
        const updatedAt = new Date(l.updated_at || l.created_at)
        return showSold && updatedAt > thirtyDaysAgo
      }
      return true
    })
    if (searchTerm) filtered = filtered.filter(l => l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    if (selectedCategory) filtered = filtered.filter(l => l.category === selectedCategory)
    if (selectedDorm) filtered = filtered.filter(l => l.dorm === selectedDorm)
    if (showFreeOnly) filtered = filtered.filter(l => l.is_free)

    switch(sortBy) {
      case 'price_asc': filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0)); break
      case 'price_desc': filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0)); break
      case 'newest': filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break
      case 'most_liked': filtered = [...filtered].sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0)); break
      case 'ending_soon':
        filtered = [...filtered].sort((a, b) => {
          if (!a.needs_to_be_gone_by && !b.needs_to_be_gone_by) return 0
          if (!a.needs_to_be_gone_by) return 1
          if (!b.needs_to_be_gone_by) return -1
          return new Date(a.needs_to_be_gone_by) - new Date(b.needs_to_be_gone_by)
        }); break
      default:
        filtered = [...filtered].sort((a, b) => {
          const today = new Date()
          const aDeadline = a.needs_to_be_gone_by ? new Date(a.needs_to_be_gone_by) : null
          const bDeadline = b.needs_to_be_gone_by ? new Date(b.needs_to_be_gone_by) : null
          const aUrgent = aDeadline && aDeadline <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          const bUrgent = bDeadline && bDeadline <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (aUrgent && !bUrgent) return -1
          if (!aUrgent && bUrgent) return 1
          const aPriority = calculateYearLevel(a.profiles?.class_year, a.profiles?.graduation_term).priority
          const bPriority = calculateYearLevel(b.profiles?.class_year, b.profiles?.graduation_term).priority
          return aPriority - bPriority
        })
    }
    setFilteredListings(filtered)
  }

  const toggleLike = async (listingId) => {
    if (!user) return
    try {
      if (userLikes.has(listingId)) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('listing_id', listingId)
        setUserLikes(prev => { const s = new Set(prev); s.delete(listingId); return s })
        setLikeCounts(prev => ({ ...prev, [listingId]: (prev[listingId] || 1) - 1 }))
        setLikedCount(prev => prev - 1)
      } else {
        await supabase.from('likes').insert([{ user_id: user.id, listing_id: listingId }])
        setUserLikes(prev => new Set([...prev, listingId]))
        setLikeCounts(prev => ({ ...prev, [listingId]: (prev[listingId] || 0) + 1 }))
        setLikedCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const isNew = (createdAt) => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    return new Date(createdAt) > threeDaysAgo
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getAnnouncementStyle = (type) => {
    switch(type) {
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-900'
      case 'maintenance': return 'bg-red-100 border-red-500 text-red-900'
      default: return 'bg-blue-100 border-blue-500 text-blue-900'
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  if (!user) return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Wellesley Finds</h1>
          <Link href="/auth" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
            Sign In / Sign Up
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">Welcome to the Wellesley Finds! 💙</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The easiest way for Wellesley students to buy and sell items within our campus community. From furniture to textbooks, find great deals from fellow Wellesley sibs!
          </p>
          <Link href="/auth" className="bg-blue-600 text-white px-8 py-4 rounded-md hover:bg-blue-700 text-xl font-medium inline-block">
            Get Started →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl mb-4">🛍️</div>
            <h3 className="text-xl font-bold mb-2">Buy</h3>
            <p className="text-gray-600">Browse listings from fellow Wellesley students. Find furniture, textbooks, electronics and more at great prices.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold mb-2">Sell</h3>
            <p className="text-gray-600">Declutter before moving out! List your items in minutes and connect directly with buyers on campus.</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-2">Connect</h3>
            <p className="text-gray-600">Message sellers, make offers, and arrange pickups - all within our safe, Wellesley-only platform.</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-8 text-center mb-8">
          <h3 className="text-2xl font-bold mb-4">Wellesley Students Only 🔒</h3>
          <p className="text-gray-600 mb-6">
            This platform is exclusively for Wellesley College students. You must have a valid <strong>@wellesley.edu</strong> email address to sign up.
          </p>
          <Link href="/auth" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium inline-block">
            Sign Up Now
          </Link>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Important Notice</h3>
          <p className="text-red-700 text-sm">
            This platform is strictly for legal goods only. The sale or trade of illegal items, controlled substances, weapons, or any other prohibited goods is strictly forbidden and <strong>will be reported to Wellesley College administration and law enforcement</strong>. By using this platform, you agree to our community guidelines and code of conduct.
          </p>
        </div>
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
            ☕ Buy me a coffee!
          </a>
          <div>
            <a href="/terms" className="text-gray-400 hover:text-gray-600 text-xs hover:underline">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}
      {showProfileSetup && user && <ProfileSetupModal userId={user.id} onComplete={() => setShowProfileSetup(false)} />}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Wellesley Finds</h1>
          <div className="hidden md:flex items-center gap-5">
            <Link href="/help" className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 font-bold" title="Help">?</Link>
<Link href="/announcements" className="relative text-2xl" title="Announcements">
  🔔
  {unreadAnnouncementsCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{unreadAnnouncementsCount}</span>
  )}
</Link>            
<Link href="/my-listings" className="relative text-gray-600 hover:text-gray-900 text-sm font-medium">
              My Listings
              {pendingOffersCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{pendingOffersCount}</span>
              )}
            </Link>
            <Link href="/my-purchases" className="text-gray-600 hover:text-gray-900 text-sm font-medium">My Purchases</Link>
            <Link href="/create-listing" className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">Create Listing</Link>
            <Link href="/my-likes" className="relative text-2xl" title="My Likes">
              ❤️
              {likedCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{likedCount}</span>
              )}
            </Link>
            <Link href="/messages" className="relative text-2xl" title="Messages">
              💬
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{unreadMessagesCount}</span>
              )}
            </Link>
            <Link href="/profile" className="text-2xl" title="My Profile">👤</Link>
            {isAdmin && <Link href="/admin" className="text-2xl" title="Admin Dashboard">⭐</Link>}
            <button onClick={handleSignOut} className="text-gray-600 hover:text-gray-900 text-sm">Sign Out</button>
          </div>
          <button className="md:hidden flex flex-col gap-1 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span className="block w-6 h-0.5 bg-gray-600"></span>
            <span className="block w-6 h-0.5 bg-gray-600"></span>
            <span className="block w-6 h-0.5 bg-gray-600"></span>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t px-4 py-4 space-y-3">
            <Link href="/help" className="block text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>❓ Help</Link>
<Link href="/announcements" className="flex justify-between text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
  🔔 Announcements
  {unreadAnnouncementsCount > 0 && <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{unreadAnnouncementsCount}</span>}
</Link>            
<Link href="/my-listings" className="flex justify-between text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
              My Listings
              {pendingOffersCount > 0 && <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{pendingOffersCount}</span>}
            </Link>
            <Link href="/my-purchases" className="block text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>My Purchases</Link>
            <Link href="/create-listing" className="block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center" onClick={() => setMobileMenuOpen(false)}>Create Listing</Link>
            <Link href="/my-likes" className="flex justify-between text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
              ❤️ Liked Items
              {likedCount > 0 && <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{likedCount}</span>}
            </Link>
            <Link href="/messages" className="flex justify-between text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
              💬 Messages
              {unreadMessagesCount > 0 && <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{unreadMessagesCount}</span>}
            </Link>
            <Link href="/profile" className="block text-gray-600 hover:text-gray-900 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>👤 My Profile</Link>
            {isAdmin && <Link href="/admin" className="block text-yellow-600 hover:text-yellow-700 py-2 border-b" onClick={() => setMobileMenuOpen(false)}>⭐ Admin Dashboard</Link>}
            <button onClick={handleSignOut} className="block w-full text-left text-gray-600 hover:text-gray-900 py-2">Sign Out</button>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <input type="text" placeholder="Search listings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-md" />
          <div className="flex gap-3 flex-wrap">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={selectedDorm} onChange={(e) => setSelectedDorm(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Dorms</option>
              {dorms.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
              <option value="default">Sort: Default</option>
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Sort: Price ↑</option>
              <option value="price_desc">Sort: Price ↓</option>
              <option value="most_liked">Sort: Most Liked</option>
              <option value="ending_soon">Sort: Ending Soon</option>
            </select>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white text-sm">
              <input type="checkbox" checked={showFreeOnly} onChange={(e) => setShowFreeOnly(e.target.checked)} className="w-4 h-4" />
              <span>Free only</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white text-sm">
              <input type="checkbox" checked={showSold} onChange={(e) => setShowSold(e.target.checked)} className="w-4 h-4" />
              <span>Show sold</span>
            </label>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Available Items ({filteredListings.length})</h2>

        {filteredListings.length === 0 ? (
          <p className="text-gray-600">No listings found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const imageToShow = listing.image_url || listing.extra_images?.[0]?.image_url
              return (
                <div key={listing.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer" onClick={() => setSelectedListing(listing)}>
                  {imageToShow && (
                    <div className="relative">
                      <img src={imageToShow} alt={listing.title} className={`w-full h-48 object-cover ${listing.is_sold ? 'grayscale' : ''}`} />
                      {listing.is_sold && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="transform -rotate-45 bg-gray-700 bg-opacity-90 text-white text-4xl font-bold py-2 px-16 shadow-lg">SOLD</div>
                        </div>
                      )}
                      {!listing.is_sold && getYearLevelBadge(listing.profiles?.class_year, listing.profiles?.graduation_term)}
                      {isNew(listing.created_at) && !listing.is_sold && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded z-10">NEW</div>
                      )}
                      {listing.is_free && !listing.is_sold && (
                        <div className="absolute bottom-2 left-2 bg-green-600 text-white text-sm font-bold px-3 py-1 rounded">FREE</div>
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold flex-1 leading-tight">{listing.title}</h3>
                      <div className="flex flex-col items-center ml-2">
                        <button onClick={() => toggleLike(listing.id)} className="text-2xl hover:scale-110 transition-transform">
                          {userLikes.has(listing.id) ? '❤️' : '🤍'}
                        </button>
                        {likeCounts[listing.id] > 0 && (
                          <span className="text-xs text-gray-500">{likeCounts[listing.id]}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{listing.category}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConditionStyle(listing.condition)}`}>
                        {getConditionLabel(listing.condition)}
                      </span>
                      {listing.is_negotiable && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Negotiable</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {listing.is_free ? (
                          <span className="text-2xl font-bold text-green-600">FREE</span>
                        ) : (
                          <span className="text-2xl font-bold text-green-600">${listing.price}</span>
                        )}
                        {listing.original_price && !listing.is_free && (
                          <span className="text-sm text-gray-400 line-through ml-2">${listing.original_price}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">📍 {listing.dorm}</p>
                    {listing.available_on && <p className="text-xs text-gray-500 mb-1">📅 {listing.available_on}</p>}
                    {listing.needs_to_be_gone_by && (
                      <p className="text-xs text-red-600 font-semibold mb-2">⚠️ Gone by: {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}</p>
                    )}
                    {!listing.is_sold && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-gray-400 mb-2">
                          Seller: {listing.profiles?.name}
                          {adminIds.has(listing.user_id) && <span className="ml-1">⭐</span>}
                        </p>
                        <div className="flex flex-col gap-1">
                          <Link href={`/listing/${listing.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                            💬 Message / Make Offer
                          </Link>
                          <a href={`mailto:${listing.profiles?.email}?subject=Interest in: ${encodeURIComponent(listing.title)}`} className="text-sm text-blue-600 hover:underline">
                            📧 Email Seller
                          </a>
                          {listing.profiles?.phone && (
                            <>
                              <a href={`tel:${listing.profiles?.phone}`} className="text-sm text-blue-600 hover:underline">
                                📱 {listing.profiles?.phone}
                              </a>
                              <a href={`sms:${listing.profiles?.phone}?body=Hi, I'm interested in your listing: ${encodeURIComponent(listing.title)}`} className="text-sm text-blue-600 hover:underline">
                                💬 Text Seller
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
            ☕ Buy me a coffee!
          </a>
          <div>
            <a href="/terms" className="text-gray-400 hover:text-gray-600 text-xs hover:underline">Terms of Use</a>
          </div>
        </div>
      </footer>

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4 py-8" onClick={() => setSelectedListing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b">
              <h2 className="text-2xl font-bold pr-4">{selectedListing.title}</h2>
              <button onClick={() => setSelectedListing(null)} className="text-gray-400 hover:text-gray-600 text-2xl flex-shrink-0">✕</button>
            </div>

            {/* Image */}
            {(selectedListing.image_url || selectedListing.extra_images?.[0]?.image_url) && (
              <img
                src={selectedListing.image_url || selectedListing.extra_images?.[0]?.image_url}
                alt={selectedListing.title}
                className="w-full h-72 object-cover"
              />
            )}

            <div className="p-6 space-y-4">
              {/* Price */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl font-bold text-green-600">
                  {selectedListing.is_free ? 'FREE' : `$${selectedListing.price}`}
                </span>
                {selectedListing.original_price && !selectedListing.is_free && (
                  <span className="text-gray-400 line-through text-lg">${selectedListing.original_price}</span>
                )}
                {selectedListing.is_negotiable && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">💜 Negotiable</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{selectedListing.category}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConditionStyle(selectedListing.condition)}`}>
                  {getConditionLabel(selectedListing.condition)}
                </span>
                {getYearLevelBadge(selectedListing.profiles?.class_year, selectedListing.profiles?.graduation_term)}
              </div>

              {/* Description */}
              {selectedListing.description && (
                <p className="text-gray-700">{selectedListing.description}</p>
              )}

              {/* Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-gray-600">📍 <strong>Location:</strong> {selectedListing.dorm}</p>
                <p className="text-gray-600">💳 <strong>Payment:</strong> {selectedListing.payment_method}</p>
                {selectedListing.available_on && <p className="text-gray-600">📅 <strong>Available:</strong> {selectedListing.available_on}</p>}
                {selectedListing.needs_to_be_gone_by && (
                  <p className="text-red-600 font-semibold">⚠️ <strong>Gone by:</strong> {new Date(selectedListing.needs_to_be_gone_by).toLocaleDateString()}</p>
                )}
              </div>

              {/* Seller */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-3">
                  Seller: <strong>{selectedListing.profiles?.name}</strong>
                  {adminIds.has(selectedListing.user_id) && <span className="ml-1">⭐</span>}
                </p>
                {!selectedListing.is_sold && (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/listing/${selectedListing.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition text-center"
                      onClick={() => setSelectedListing(null)}
                    >
                      💬 Message / Make Offer
                    </Link>
                    <a href={`mailto:${selectedListing.profiles?.email}?subject=Interest in: ${encodeURIComponent(selectedListing.title)}`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition text-center">📧 Email Seller</a>
                    {selectedListing.profiles?.phone && (
                      
                        href={`sms:${selectedListing.profiles?.phone}?body=Hi, I'm interested in your listing: ${encodeURIComponent(selectedListing.title)}`}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition text-center"
                      >
                        💬 Text Seller
                      </a>
                    )}
                  </div>
                )}
                {selectedListing.is_sold && (
                  <p className="text-red-600 font-bold text-center py-2">This item is SOLD</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
