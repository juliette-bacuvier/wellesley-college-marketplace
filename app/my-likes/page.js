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
      // Get user's likes
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

      // Get the actual listings
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .in('id', listingIds)
        .eq('is_archived', false)

      if (listingsError) throw listingsError

      // Fetch seller profiles separately
      const listingsWithProfiles = await Promise.all((listings || []).map(async (listing) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', listing.user_id)
          .single()
        
        return { ...listing, profiles: profile }
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Liked Items</h1>
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
            {likedListings.map((listing) => (
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
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold flex-1">{listing.title}</h3>
                    <button
                      onClick={() => removeLike(listing.id)}
                      className="text-2xl"
                      title="Unlike"
                    >
                      ❤️
                    </button>
                  </div>
                  <p className="text-gray-600 mb-2 text-sm">{listing.description}</p>
                  
                  <div className="space-y-1 text-sm mb-3">
                    <p className="text-blue-600 font-medium">{listing.category}</p>
                    <p className="text-gray-500">📍 {listing.dorm}</p>
                    {listing.available_on && (
                      <p className="text-gray-500">📅 Available: {listing.available_on}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    {listing.is_free ? (
                      <span className="text-2xl font-bold text-green-600">FREE</span>
                    ) : (
                      <span className="text-2xl font-bold text-green-600">${listing.price}</span>
                    )}
                    {listing.original_price && !listing.is_free && (
                      <span className="text-sm text-gray-500 line-through">${listing.original_price}</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500">Condition: {listing.condition}</p>

                  {!listing.is_sold && (
                    <div className="mt-3 pt-3 border-t">
                      <Link
                        href={`/listing/${listing.id}`}
                        className="block text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                      >
                        View Details / Message Seller
                      </Link>
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
