'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function SellerProfile() {
  const params = useParams()
  const sellerId = params.id
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [seller, setSeller] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await fetchSellerAndListings()
    }
    init()
  }, [sellerId])

  const fetchSellerAndListings = async () => {
    try {
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('name, email, class_year, dorm')
        .eq('id', sellerId)
        .single()
      if (sellerError) throw sellerError
      setSeller(sellerData)

      // Fetch seller's active listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', sellerId)
        .eq('is_archived', false)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
      if (listingsError) throw listingsError

      // Load images for each listing
      const listingsWithImages = await Promise.all((listingsData || []).map(async (listing) => {
        const { data: images } = await supabase
          .from('listing_images')
          .select('image_url')
          .eq('listing_id', listing.id)
          .order('display_order', { ascending: true })
        return { ...listing, extra_images: images || [] }
      }))

      setListings(listingsWithImages)
    } catch (error) {
      console.error('Error fetching seller:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Wellesley Finds</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm">← Back to Marketplace</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Seller info */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
              {seller?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{seller?.name}</h2>
              <div className="flex gap-4 text-sm text-gray-600">
                {seller?.class_year && <span>🎓 Class of {seller.class_year}</span>}
                {seller?.dorm && <span>🏠 {seller.dorm}</span>}
              </div>
              <div className="mt-4 flex gap-3">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{listings.length}</p>
                  <p className="text-xs text-gray-600">Active Listings</p>
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{listings.filter(l => l.is_sold).length}</p>
                  <p className="text-xs text-gray-600">Items Sold</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings */}
        <h3 className="text-2xl font-bold mb-4">All Listings</h3>
        {listings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">This seller has no active listings at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {listings.map(listing => {
              const imageToShow = listing.image_url || listing.extra_images?.[0]?.image_url
              return (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200">
                  {imageToShow && (
                    <div className="relative">
                      <img src={imageToShow} alt={listing.title} className="w-full h-56 object-cover" />
                      {listing.is_sold && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="bg-gray-800 text-white px-4 py-2 rounded-full font-bold text-sm">SOLD</span>
                        </div>
                      )}
                      {listing.is_free && !listing.is_sold && (
                        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">FREE</span>
                      )}
                      {listing.is_negotiable && !listing.is_free && !listing.is_sold && (
                        <span className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">NEGOTIABLE</span>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{listing.title}</h3>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{listing.category}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full capitalize">{listing.condition.replace('_', ' ')}</span>
                    </div>
                    {listing.original_price && listing.original_price > listing.price && (
                      <p className="text-xs text-gray-400 line-through">${listing.original_price.toFixed(2)}</p>
                    )}
                    <p className="text-xl font-bold text-green-600">${listing.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">📍 {listing.dorm}</p>
                  </div>
                </Link>
              )
            })}
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
