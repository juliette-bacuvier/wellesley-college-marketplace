'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyLikes() {
  const [likedListings, setLikedListings] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      await fetchLikedListings(user.id)
    }
    init()
  }, [])

  const fetchLikedListings = async (userId) => {
    try {
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('listing_id')
        .eq('user_id', userId)

      if (likesError) throw likesError

      const listingIds = likes.map(like => like.listing_id)

      if (listingIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)
        .eq('is_archived', false)

      if (listingsError) throw listingsError

      const listingsWithProfiles = await Promise.all((listings || []).map(async (listing) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', listing.user_id)
          .single()

        const { data: images } = await supabase
          .from('listing_images')
          .select('image_url')
          .eq('listing_id', listing.id)
          .order('display_order', { ascending: true })
          .limit(1)

        return { 
          ...listing, 
          profiles: profile,
          extra_images: images || []
        }
      }))

      setLikedListings(listingsWithProfiles)
    } catch (error) {
      console.error('Error fetching liked listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeLike = async (listingId) => {
    try {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
      setLikedListings(likedListings.filter(l => l.id !== listingId))
    } catch (error) {
      console.error('Error removing like:', error)
    }
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">❤️ My Liked Items</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">
          Items You've Liked ({likedListings.length})
        </h2>

        {likedListings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't liked any items yet.</p>
            <Link href="/" className="text-blue-600 hover:underline">
              Browse Marketplace →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likedListings.map((listing) => {
              const imageToShow = listing.image_url || listing.extra_images?.[0]?.image_url
              return (
                <div key={listing.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200">
                  {imageToShow && (
                    <div className="relative">
                      <img
                        src={imageToShow}
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
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold flex-1 leading-tight">{listing.title}</h3>
                      <button
                        onClick={() => removeLike(listing.id)}
                        className="text-2xl hover:scale-110 transition-transform ml-2"
                        title="Unlike"
                      >
                        ❤️
                      </button>
                    </div>

                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{listing.description}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {listing.category}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConditionStyle(listing.condition)}`}>
                        {getConditionLabel(listing.condition)}
                      </span>
                      {listing.is_negotiable && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          Negotiable
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      {listing.is_free ? (
                        <span className="text-2xl font-bold text-green-600">FREE</span>
                      ) : (
                        <span className="text-2xl font-bold text-green-600">${listing.price}</span>
                      )}
                      {listing.original_price && !listing.is_free && (
                        <span className="text-sm text-gray-400 line-through">${listing.original_price}</span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mb-1">📍 {listing.dorm}</p>
                    {listing.available_on && (
                      <p className="text-xs text-gray-500 mb-1">📅 {listing.available_on}</p>
                    )}
                    {listing.needs_to_be_gone_by && (
                      <p className="text-xs text-red-600 font-semibold mb-2">
                        ⚠️ Gone by: {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}
                      </p>
                    )}

                    {!listing.is_sold && (
                      <div className="mt-3 pt-3 border-t">
                        <Link
                          href={`/listing/${listing.id}`}
                          className="block text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          💬 View Details / Message Seller
                        </Link>
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
        <div className="max-w-7xl mx-auto px-4 text-center">
          
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
