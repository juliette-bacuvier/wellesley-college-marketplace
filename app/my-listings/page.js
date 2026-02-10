'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

async function sendEmail(type, to, data) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data })
    })
  } catch (error) {
    console.error('Error sending email:', error)
  }
}

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [viewingOffersFor, setViewingOffersFor] = useState(null)
  const [offers, setOffers] = useState([])
  const [conversations, setConversations] = useState({})
  const [likeCounts, setLikeCounts] = useState({})
  const router = useRouter()

  const categories = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Kitchen & Appliances', 'Decor', 'Sports & Fitness', 'Other']
  const dorms = ['Cazenove', 'Shafer', 'Pomeroy', 'Beebe', 'Tower Court East', 'Tower Court West', 'Severance', 'Claflin', 'Lake House', 'Casa Cervantes', 'French House', 'Stone Davis', 'Bates', 'McAfee', 'Freeman', 'Munger']

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (!user) {
        router.push('/auth')
      } else {
        fetchMyListings(user.id)
        fetchConversations(user.id)
        fetchLikeCounts()
        fetchUserProfile(user.id)
      }
    })
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchMyListings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error

      const listingsWithImages = await Promise.all((data || []).map(async (listing) => {
        const { data: images } = await supabase
          .from('listing_images')
          .select('image_url')
          .eq('listing_id', listing.id)
          .order('display_order', { ascending: true })
        return { ...listing, extra_images: images || [] }
      }))

      setListings(listingsWithImages)
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, profiles!conversations_buyer_id_fkey(name, email)')
        .eq('seller_id', userId)
      if (error) throw error
      const convMap = {}
      data.forEach(conv => {
        if (!convMap[conv.listing_id]) convMap[conv.listing_id] = []
        convMap[conv.listing_id].push(conv)
      })
      setConversations(convMap)
    } catch (error) {
      console.error('Error fetching conversations:', error)
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

  const fetchOffersForListing = async (listingId) => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, profiles!offers_buyer_id_fkey(name, email, email_notifications, phone)')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setOffers(data || [])
      setViewingOffersFor(listingId)
    } catch (error) {
      console.error('Error fetching offers:', error)
    }
  }

  const acceptOffer = async (offerId, buyerId, listingId) => {
    if (!confirm('Accept this offer? This will mark the item as sold.')) return
    try {
      const offer = offers.find(o => o.id === offerId)
      const listing = listings.find(l => l.id === listingId)

      await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId)
      await supabase.from('offers').update({ status: 'rejected' }).eq('listing_id', listingId).neq('id', offerId)
      await supabase.from('listings').update({ is_sold: true, buyer_id: buyerId }).eq('id', listingId)

      // Send email to buyer if they have notifications enabled
      if (offer?.profiles?.email_notifications !== false) {
        await sendEmail('offer_accepted', offer.profiles.email, {
          buyer_name: offer.profiles.name,
          seller_name: userProfile?.name || 'The seller',
          seller_email: userProfile?.email,
          seller_phone: userProfile?.phone,
          listing_title: listing?.title,
          offer_amount: offer?.amount
        })
      }

      alert('Offer accepted! Item marked as sold.')
      await fetchMyListings(user.id)
      await fetchOffersForListing(listingId)
    } catch (error) {
      console.error('Error accepting offer:', error)
      alert('Failed to accept offer')
    }
  }

  const rejectOffer = async (offerId, listingId) => {
    try {
      await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId)
      alert('Offer rejected')
      await fetchOffersForListing(listingId)
    } catch (error) {
      console.error('Error rejecting offer:', error)
    }
  }

  const sendCounterOffer = async (conversationId, buyerId, listingId) => {
    const amount = prompt('Enter your counter-offer amount:')
    if (!amount) return
    try {
      await supabase.from('offers').insert([{
        conversation_id: conversationId,
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: user.id,
        amount: parseFloat(amount),
        offered_by: 'seller',
        status: 'pending'
      }])
      await supabase.from('messages').insert([{
        conversation_id: conversationId,
        sender_id: user.id,
        message: `📝 Counter-offer: $${amount}`
      }])
      alert('Counter-offer sent!')
      await fetchOffersForListing(listingId)
    } catch (error) {
      console.error('Error sending counter-offer:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    try {
      const { error } = await supabase.from('listings').delete().eq('id', id)
      if (error) throw error
      setListings(listings.filter(l => l.id !== id))
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Error deleting listing')
    }
  }

  const toggleSold = async (id, currentStatus) => {
    try {
      const updates = { is_sold: !currentStatus }
      if (currentStatus) updates.buyer_id = null
      const { error } = await supabase.from('listings').update(updates).eq('id', id)
      if (error) throw error
      setListings(listings.map(l => l.id === id ? { ...l, ...updates } : l))
    } catch (error) {
      console.error('Error updating listing:', error)
    }
  }

  const toggleArchive = async (id, currentStatus) => {
    try {
      const { error } = await supabase.from('listings').update({ is_archived: !currentStatus }).eq('id', id)
      if (error) throw error
      setListings(listings.map(l => l.id === id ? { ...l, is_archived: !currentStatus } : l))
    } catch (error) {
      console.error('Error archiving listing:', error)
    }
  }

  const startEdit = (listing) => {
    setEditingId(listing.id)
    setEditForm({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      original_price: listing.original_price,
      condition: listing.condition,
      category: listing.category,
      dorm: listing.dorm,
      payment_method: listing.payment_method,
      available_on: listing.available_on,
      needs_to_be_gone_by: listing.needs_to_be_gone_by,
      is_free: listing.is_free,
      is_negotiable: listing.is_negotiable
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const saveEdit = async (id) => {
    try {
      const { error } = await supabase.from('listings').update(editForm).eq('id', id)
      if (error) throw error
      setListings(listings.map(l => l.id === id ? { ...l, ...editForm } : l))
      setEditingId(null)
      setEditForm({})
    } catch (error) {
      console.error('Error updating listing:', error)
      alert('Error updating listing')
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Listings</h1>
          <div className="space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">Back to Home</Link>
            <Link href="/create-listing" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Create New</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Your Listings ({listings.length})</h2>

        {listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any listings yet.</p>
            <Link href="/create-listing" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => {
              const imageToShow = listing.image_url || listing.extra_images?.[0]?.image_url
              return (
                <div key={listing.id} className="bg-white rounded-xl shadow-md p-6">
                  {editingId === listing.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input type="text" value={editForm.title || ''} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows="3" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Category</label>
                          <select value={editForm.category || ''} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="px-3 py-2 border rounded-md w-full">
                            <option value="">Select category</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Dorm</label>
                          <select value={editForm.dorm || ''} onChange={(e) => setEditForm({...editForm, dorm: e.target.value})} className="px-3 py-2 border rounded-md w-full">
                            <option value="">Select dorm</option>
                            {dorms.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Price ($)</label>
                          <div className="flex items-center gap-3">
                            <input type="number" step="0.01" value={editForm.price || ''} onChange={(e) => setEditForm({...editForm, price: e.target.value})} disabled={editForm.is_free} className="flex-1 px-3 py-2 border rounded-md disabled:bg-gray-100" />
                            <label className="flex items-center gap-2 whitespace-nowrap">
                              <input type="checkbox" checked={editForm.is_free || false} onChange={(e) => setEditForm({...editForm, is_free: e.target.checked, price: e.target.checked ? 0 : editForm.price})} className="w-4 h-4" />
                              <span className="text-sm font-medium text-green-600">Free</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Original Price ($)</label>
                          <input type="number" step="0.01" value={editForm.original_price || ''} onChange={(e) => setEditForm({...editForm, original_price: e.target.value})} className="px-3 py-2 border rounded-md w-full" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="edit-negotiable" checked={editForm.is_negotiable || false} onChange={(e) => setEditForm({...editForm, is_negotiable: e.target.checked})} className="w-4 h-4" />
                        <label htmlFor="edit-negotiable" className="text-sm font-medium text-purple-700">Price is negotiable</label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Condition</label>
                        <select value={editForm.condition || 'good'} onChange={(e) => setEditForm({...editForm, condition: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                          <option value="new">New</option>
                          <option value="like_new">Like New</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Available for Pickup</label>
                        <input type="text" value={editForm.available_on || ''} onChange={(e) => setEditForm({...editForm, available_on: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Needs to be gone by</label>
                        <input type="date" value={editForm.needs_to_be_gone_by || ''} onChange={(e) => setEditForm({...editForm, needs_to_be_gone_by: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Method</label>
                        <input type="text" value={editForm.payment_method || ''} onChange={(e) => setEditForm({...editForm, payment_method: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(listing.id)} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Save</button>
                        <button onClick={cancelEdit} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-2xl font-bold">{listing.title}</h3>
                            {listing.is_archived && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Archived</span>}
                            {listing.is_sold && <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">SOLD</span>}
                          </div>
                          <p className="text-gray-600 mb-3">{listing.description}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{listing.category}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConditionStyle(listing.condition)}`}>
                              {getConditionLabel(listing.condition)}
                            </span>
                            {listing.is_negotiable && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Negotiable</span>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-2xl font-bold text-green-600">{listing.is_free ? 'FREE' : `$${listing.price}`}</p>
                            {listing.original_price && <p className="text-sm text-gray-400 line-through">${listing.original_price}</p>}
                            <p className="text-gray-500">📍 {listing.dorm} • 💳 {listing.payment_method}</p>
                            {listing.available_on && <p className="text-gray-500">📅 {listing.available_on}</p>}
                            {listing.needs_to_be_gone_by && (
                              <p className="text-red-600 font-medium">⚠️ Gone by: {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}</p>
                            )}
                            <div className="flex gap-4 mt-2">
                              {conversations[listing.id] && (
                                <p className="text-purple-600 font-medium">💬 {conversations[listing.id].length} interested buyer(s)</p>
                              )}
                              {likeCounts[listing.id] > 0 && (
                                <p className="text-pink-600 font-medium">❤️ {likeCounts[listing.id]} like{likeCounts[listing.id] !== 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {imageToShow && (
                          <img src={imageToShow} alt={listing.title} className="w-32 h-32 object-cover rounded-lg ml-4 shadow-sm" />
                        )}
                      </div>

                      <div className="flex gap-2 pt-4 border-t flex-wrap">
                        <button onClick={() => fetchOffersForListing(listing.id)} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm">View Offers</button>
                        <button onClick={() => toggleSold(listing.id, listing.is_sold)} className={`px-4 py-2 rounded-md text-sm ${listing.is_sold ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}>
                          {listing.is_sold ? 'Mark Available' : 'Mark Sold'}
                        </button>
                        <button onClick={() => toggleArchive(listing.id, listing.is_archived)} className={`px-4 py-2 rounded-md text-sm ${listing.is_archived ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-600 text-white hover:bg-gray-700'}`}>
                          {listing.is_archived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button onClick={() => startEdit(listing)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">Edit</button>
                        <button onClick={() => handleDelete(listing.id)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm">Delete</button>
                      </div>

                      {viewingOffersFor === listing.id && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                          <h4 className="font-bold text-lg mb-3">Offers for this listing</h4>
                          {offers.length === 0 ? (
                            <p className="text-gray-600">No offers yet</p>
                          ) : (
                            <div className="space-y-3">
                              {offers.map((offer) => (
                                <div key={offer.id} className="bg-white p-3 rounded border">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">
                                        ${offer.amount}
                                        <span className="text-xs ml-2 text-gray-500">from {offer.profiles?.name}</span>
                                      </p>
                                      <p className="text-xs text-gray-500">{offer.offered_by === 'buyer' ? 'Buyer offer' : 'Your counter-offer'}</p>
                                      <p className="text-xs text-gray-400">{new Date(offer.created_at).toLocaleString()}</p>
                                      <p className={`text-sm font-medium mt-1 ${offer.status === 'accepted' ? 'text-green-600' : offer.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                                        Status: {offer.status.toUpperCase()}
                                      </p>
                                    </div>
                                    {offer.status === 'pending' && offer.offered_by === 'buyer' && (
                                      <div className="flex gap-2">
                                        <button onClick={() => acceptOffer(offer.id, offer.buyer_id, listing.id)} className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700">Accept</button>
                                        <button onClick={() => rejectOffer(offer.id, listing.id)} className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700">Reject</button>
                                        <button onClick={() => sendCounterOffer(offer.conversation_id, offer.buyer_id, listing.id)} className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700">Counter</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => setViewingOffersFor(null)} className="mt-3 text-sm text-blue-600 hover:underline">Close</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
