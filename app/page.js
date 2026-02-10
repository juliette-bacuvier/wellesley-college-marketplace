'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [userLikes, setUserLikes] = useState(new Set())
  const [likeCounts, setLikeCounts] = useState({})
  const [likedCount, setLikedCount] = useState(0)
  const [pendingOffersCount, setPendingOffersCount] = useState(0)
  const router = useRouter()

  const categories = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Kitchen & Appliances', 'Decor', 'Sports & Fitness', 'Other']
  const dorms = ['Cazenove', 'Shafer', 'Pomeroy', 'Beebe', 'Tower Court East', 'Tower Court West', 'Severance', 'Claflin', 'Lake House', 'Casa Cervantes', 'French House', 'Stone Davis', 'Bates', 'McAfee', 'Freeman', 'Munger']

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user) {
        router.push('/auth')
      } else {
        fetchUserLikes(user.id)
        fetchPendingOffers(user.id)
      }
    })
    fetchListings()
    fetchLikeCounts()
    autoArchiveOldListings()
  }, [])

  useEffect(() => {
    filterListings()
  }, [listings, searchTerm, selectedCategory, selectedDorm, showSold, showFreeOnly])

  const fetchPendingOffers = async (userId) => {
    try {
      // Get user's listings
      const { data: userListings } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', userId)

      if (!userListings || userListings.length === 0) return

      const listingIds = userListings.map(l => l.id)

      // Get pending offers for user's listings
      const { data: offers } = await supabase
        .from('offers')
        .select('id')
        .in('listing_id', listingIds)
        .eq('status', 'pending')
        .eq('offered_by', 'buyer')

      setPendingOffersCount(offers?.length || 0)
    } catch (error) {
      console.error('Error fetching pending offers:', error)
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
    
    if (graduationTerm === 'Winter') {
      if (currentMonth >= 8) {
        yearsUntilGrad -= 0.5
      }
    } else if (graduationTerm === 'Spring') {
      if (currentMonth >= 5) {
        yearsUntilGrad -= 1
      }
    }
    
    if (yearsUntilGrad <= 0.5) {
      return { level: 'Senior', priority: 1 }
    } else if (yearsUntilGrad <= 1.5) {
      return { level: 'Junior', priority: 2 }
    } else if (yearsUntilGrad <= 2.5) {
      return { level: 'Sophomore', priority: 3 }
    } else {
      return { level: 'Freshman', priority: 4 }
    }
  }

  const getYearLevelBadge = (classYear, graduationTerm) => {
    const { level } = calculateYearLevel(classYear, graduationTerm)
    
    const styles = {
      'Senior': 'bg-red-600 text-white font-bold',
      'Exchange Student': 'bg-red-600 text-white font-bold',
      'Junior': 'bg-orange-500 text-white font-bold',
      'Sophomore': 'bg-yellow-500 text-white font-bold',
      'Freshman': 'bg-green-600 text-white font-bold',
      'Graduate Student': 'bg-gray-500 text-white font-bold'
    }
    
    return level ? (
      <div className={`absolute top-2 left-2 ${styles[level]} text-xs px-2 py-1 rounded z-10`}>
        {level.toUpperCase()}
      </div>
    ) : null
  }

  const autoArchiveOldListings = async () => {
    try {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      await supabase
        .from('listings')
        .update({ is_archived: true })
        .lt('created_at', oneYearAgo.toISOString())
        .eq('is_archived', false)
    } catch (error) {
      console.error('Error auto-archiving old listings:', error)
    }
  }

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }
      
      const listingsWithProfiles = await Promise.all((data || []).map(async (listing) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email, phone, class_year, graduation_term')
          .eq('id', listing.user_id)
          .single()
        
        return { ...listing, profiles: profile }
      }))
      
      const sorted = listingsWithProfiles.sort((a, b) => {
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
      
      setListings(sorted)
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserLikes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('listing_id')
        .eq('user_id', userId)
      
      if (error) throw error
      setUserLikes(new Set(data.map(like => like.listing_id)))
      setLikedCount(data.length)
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }

  const fetchLikeCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('listing_id')
      
      if (error) throw error
      
      const counts = {}
      data.forEach(like => {
        counts[like.listing_id] = (counts[like.listing_id] || 0) + 1
      })
      setLikeCounts(counts)
    } catch (error) {
      console.error('Error fetching like counts:', error)
    }
  }

  const filterListings = () => {
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

    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(l => l.category === selectedCategory)
    }

    if (selectedDorm) {
      filtered = filtered.filter(l => l.dorm === selectedDorm)
    }

    if (showFreeOnly) {
      filtered = filtered.filter(l => l.is_free)
    }

    setFilteredListings(filtered)
  }

  const toggleLike = async (listingId) => {
    if (!user) return

    try {
      if (userLikes.has(listingId)) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId)
        
        if (error) throw error
        setUserLikes(prev => {
          const newSet = new Set(prev)
          newSet.delete(listingId)
          return newSet
        })
        setLikeCounts(prev => ({
          ...prev,
          [listingId]: (prev[listingId] || 1) - 1
        }))
        setLikedCount(prev => prev - 1)
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{ user_id: user.id, listing_id: listingId }])
        
        if (error) throw error
        setUserLikes(prev => new Set([...prev, listingId]))
        setLikeCounts(prev => ({
          ...prev,
          [listingId]: (prev[listingId] || 0) + 1
        }))
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
    router.push('/auth')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Wellesley College Marketplace</h1>
          <div className="flex items-center gap-6">
            <Link href="/help" className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300" title="Help">
              <span className="text-lg">?</span>
            </Link>
            <Link href="/my-listings" className="relative text-gray-600 hover:text-gray-900" title="My Listings">
              My Listings
              {pendingOffersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingOffersCount}
                </span>
              )}
            </Link>
            <Link href="/my-purchases" className="text-gray-600 hover:text-gray-900">
              My Purchases
            </Link>
            <Link href="/create-listing" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create Listing
            </Link>
            <Link href="/my-likes" className="relative text-gray-600 hover:text-gray-900 text-2xl" title="My Likes">
              ❤️
              {likedCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {likedCount}
                </span>
              )}
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900 text-2xl" title="My Profile">
              👤
            </Link>
            <button onClick={handleSignOut} className="text-gray-600 hover:text-gray-900">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          />
          
          <div className="flex gap-4 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={selectedDorm}
              onChange={(e) => setSelectedDorm(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Dorms</option>
              {dorms.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white">
              <input
                type="checkbox"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Free items only</span>
            </label>

            <label className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white">
              <input
                type="checkbox"
                checked={showSold}
                onChange={(e) => setShowSold(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Show sold items</span>
            </label>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-6">
          Available Items ({filteredListings.length})
        </h2>
        
        {filteredListings.length === 0 ? (
          <p className="text-gray-600">No listings found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden relative">
                {listing.image_url && (
                  <div className="relative">
                    <img 
                      src={listing.image_url} 
                      alt={listing.title} 
                      className={`w-full h-48 object-cover ${listing.is_sold ? 'grayscale' : ''}`} 
                    />
                    {listing.is_sold && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="transform -rotate-45 bg-gray-700 bg-opacity-90 text-white text-4xl font-bold py-2 px-16 shadow-lg">
                          SOLD
                        </div>
                      </div>
                    )}
                    {!listing.is_sold && getYearLevelBadge(listing.profiles?.class_year, listing.profiles?.graduation_term)}
                    {isNew(listing.created_at) && !listing.is_sold && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
                        NEW
                      </div>
                    )}
                    {listing.is_free && !listing.is_sold && (
                      <div className="absolute bottom-2 left-2 bg-green-600 text-white text-sm font-bold px-3 py-1 rounded">
                        FREE
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold flex-1">{listing.title}</h3>
                    <div className="flex flex-col items-center ml-2">
                      <button
                        onClick={() => toggleLike(listing.id)}
                        className="text-2xl"
                      >
                        {userLikes.has(listing.id) ? '❤️' : '🤍'}
                      </button>
                      {likeCounts[listing.id] > 0 && (
                        <span className="text-xs text-gray-600">{likeCounts[listing.id]}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-2">{listing.description}</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-600 font-medium">{listing.category}</p>
                    <p className="text-gray-500">📍 {listing.dorm}</p>
                    {listing.available_on && (
                      <p className="text-gray-500">📅 Available: {listing.available_on}</p>
                    )}
                    {listing.needs_to_be_gone_by && (
                      <p className="text-red-600 font-semibold">⚠️ Needs to be gone by: {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    {listing.is_free ? (
                      <span className="text-2xl font-bold text-green-600">FREE</span>
                    ) : (
                      <span className="text-2xl font-bold text-green-600">${listing.price}</span>
                    )}
                    {listing.original_price && !listing.is_free && (
                      <span className="text-sm text-gray-500 line-through">${listing.original_price}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Condition: {listing.condition}</p>
                  <p className="text-sm text-gray-500">Payment: {listing.payment_method}</p>
                  {!listing.is_sold && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs text-gray-400">Seller: {listing.profiles?.name}</p>
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/listing/${listing.id}`}
                          className="text-sm text-blue-600 hover:underline font-medium"
                        >
                          💬 Message Seller / Make Offer
                        </Link>
                        <a 
                          href={`mailto:${listing.profiles?.email}?subject=Interest in: ${encodeURIComponent(listing.title)}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          📧 Email Seller
                        </a>
                        {listing.profiles?.phone && (
                          <>
                            <a 
                              href={`tel:${listing.profiles?.phone}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              📱 {listing.profiles?.phone}
                            </a>
                            <a 
                              href={`sms:${listing.profiles?.phone}?body=Hi, I'm interested in your listing: ${encodeURIComponent(listing.title)}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              💬 Text Seller
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
