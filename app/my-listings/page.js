'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [viewingOffersFor, setViewingOffersFor] = useState(null)
  const [offers, setOffers] = useState([])
  const [conversations, setConversations] = useState({})
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
      }
    })
  }, [])

  const fetchMyListings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setListings(data || [])
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
        if (!convMap[conv.listing_id]) {
          convMap[conv.listing_id] = []
        }
        convMap[conv.listing_id].push(conv)
      })
      setConversations(convMap)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const fetchOffersForListing = async (listingId) => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, profiles!offers_buyer_id_fkey(name, email)')
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
      // Update offer status
      await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offerId)

      // Reject all other offers for this listing
      await supabase
        .from('offers')
        .update({ status: 'rejected' })
        .eq('listing_id', listingId)
        .neq('id', offerId)

      // Mark listing as sold and assign buyer
      await supabase
        .from('listings')
        .update({ 
          is_sold: true,
          buyer_id: buyerId
        })
        .eq('id', listingId)

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
      await supabase
        .from('offers')
        .update({ status: 'rejected' })
        .eq('id', offerId)

      alert('Offer rejected')
      await fetchOffersForListing(listingId)
    } catch (error) {
      console.error('Error rejecting offer:', error)
      alert('Failed to reject offer')
    }
  }

  const sendCounterOffer = async (conversationId, buyerId, listingId) => {
    const amount = prompt('Enter your counter-offer amount:')
    if (!amount) return

    try {
      await supabase
        .from('offers')
        .insert([{
          conversation_id: conversationId,
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: user.id,
          amount: parseFloat(amount),
          offered_by: 'seller',
          status: 'pending'
        }])

      // Send message about counter-offer
      await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          message: `📝 Counter-offer: $${amount}`
        }])

      alert('Counter-offer sent!')
      await fetchOffersForListing(listingId)
    } catch (error) {
      console.error('Error sending counter-offer:', error)
      alert('Failed to send counter-offer')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this listing?')) return

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
      
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
      if (!currentStatus === false) {
        // Unmarking as sold, clear buyer
        updates.buyer_id = null
      }

      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      setListings(listings.map(l => 
        l.id === id ? { ...l, ...updates } : l
      ))
    } catch (error) {
      console.error('Error updating listing:', error)
      alert('Error updating listing')
    }
  }

  const toggleArchive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_archived: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      setListings(listings.map(l => 
        l.id === id ? { ...l, is_archived: !currentStatus } : l
      ))
    } catch (error) {
      console.error('Error archiving listing:', error)
      alert('Error archiving listing')
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
      is_free: listing.is_free
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update(editForm)
        .eq('id', id)
      
      if (error) throw error
      
      setListings(listings.map(l => 
        l.id === id ? { ...l, ...editForm } : l
      ))
      setEditingId(null)
      setEditForm({})
    } catch (error) {
      console.error('Error updating listing:', error)
      alert('Error updating listing')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Listings</h1>
          <div className="space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Back to Home
            </Link>
            <Link href="/create-listing" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create New
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">
          Your Listings ({listings.length})
        </h2>
        
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any listings yet.</p>
            <Link href="/create-listing" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow-md p-6">
                {editingId === listing.id ? (
                  <div className="space-y-4">
                    {/* Edit form - same as before */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        rows="3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                          value={editForm.category || ''}
                          onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          className="px-3 py-2 border rounded-md w-full"
                        >
                          <option value="">Select category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Dorm</label>
                        <select
                          value={editForm.dorm || ''}
                          onChange={(e) => setEditForm({...editForm, dorm: e.target.value})}
                          className="px-3 py-2 border rounded-md w-full"
                        >
                          <option value="">Select dorm</option>
                          {dorms.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.price || ''}
                            onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                            disabled={editForm.is_free}
                            className="flex-1 px-3 py-2 border rounded-md disabled:bg-gray-100"
                          />
                          <label className="flex items-center gap-2 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={editForm.is_free || false}
                              onChange={(e) => {
                                setEditForm({
                                  ...editForm, 
                                  is_free: e.target.checked,
                                  price: e.target.checked ? 0 : editForm.price
                                })
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-green-600">Free</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Original Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.original_price || ''}
                          onChange={(e) => setEditForm({...editForm, original_price: e.target.value})}
                          className="px-3 py-2 border rounded-md w-full"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Condition</label>
                      <select
                        value={editForm.condition || 'good'}
                        onChange={(e) => setEditForm({...editForm, condition: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="new">New</option>
                        <option value="like_new">Like New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Available for Pickup</label>
                      <input
                        type="text"
                        value={editForm.available_on || ''}
                        onChange={(e) => setEditForm({...editForm, available_on: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Needs to be gone by</label>
                      <input
                        type="date"
                        value={editForm.needs_to_be_gone_by || ''}
                        onChange={(e) => setEditForm({...editForm, needs_to_be_gone_by: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Payment Method</label>
                      <input
                        type="text"
                        value={editForm.payment_method || ''}
                        onChange={(e) => setEditForm({...editForm, payment_method: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(listing.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">
                          {listing.title}
                          {listing.is_archived && (
                            <span className="ml-3 text-sm bg-gray-200 text-gray-700 px-2 py-1 rounded">Archived</span>
                          )}
                          {listing.is_sold && (
                            <span className="ml-3 text-sm bg-red-600 text-white px-2 py-1 rounded">SOLD</span>
                          )}
                        </h3>
                        <p className="text-gray-600 mb-2">{listing.description}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-blue-600 font-medium">{listing.category} • 📍 {listing.dorm}</p>
                          <p className="text-2xl font-bold text-green-600">
                            {listing.is_free ? 'FREE' : `$${listing.price}`}
                          </p>
                          {listing.original_price && (
                            <p className="text-sm text-gray-500 line-through">${listing.original_price}</p>
                          )}
                          <p className="text-gray-500">Condition: {listing.condition}</p>
                          <p className="text-gray-500">Payment: {listing.payment_method}</p>
                          {listing.available_on && (
                            <p className="text-gray-500">Available: {listing.available_on}</p>
                          )}
                          {listing.needs_to_be_gone_by && (
                            <p className="text-red-600">Needs to be gone by: {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}</p>
                          )}
                          {conversations[listing.id] && (
                            <p className="text-purple-600 font-medium">
                              💬 {conversations[listing.id].length} interested buyer(s)
                            </p>
                          )}
                        </div>
                      </div>
                      {listing.image_url && (
                        <img src={listing.image_url} alt={listing.title} className="w-32 h-32 object-cover rounded-md ml-4" />
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-4 border-t flex-wrap">
                      <button
                        onClick={() => fetchOffersForListing(listing.id)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                      >
                        View Offers
                      </button>
                      <button
                        onClick={() => toggleSold(listing.id, listing.is_sold)}
                        className={`px-4 py-2 rounded-md ${
                          listing.is_sold 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                        }`}
                      >
                        {listing.is_sold ? 'Mark as Available' : 'Mark as Sold'}
                      </button>
                      <button
                        onClick={() => toggleArchive(listing.id, listing.is_archived)}
                        className={`px-4 py-2 rounded-md ${
                          listing.is_archived 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {listing.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button
                        onClick={() => startEdit(listing)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Offers Modal */}
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
                                      <span className="text-xs ml-2 text-gray-500">
                                        from {offer.profiles?.name}
                                      </span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {offer.offered_by === 'buyer' ? 'Buyer offer' : 'Your counter-offer'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {new Date(offer.created_at).toLocaleString()}
                                    </p>
                                    <p className={`text-sm font-medium mt-1 ${
                                      offer.status === 'accepted' ? 'text-green-600' :
                                      offer.status === 'rejected' ? 'text-red-600' :
                                      'text-yellow-600'
                                    }`}>
                                      Status: {offer.status.toUpperCase()}
                                    </p>
                                  </div>
                                  {offer.status === 'pending' && offer.offered_by === 'buyer' && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => acceptOffer(offer.id, offer.buyer_id, listing.id)}
                                        className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => rejectOffer(offer.id, listing.id)}
                                        className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700"
                                      >
                                        Reject
                                      </button>
                                      <button
                                        onClick={() => sendCounterOffer(offer.conversation_id, offer.buyer_id, listing.id)}
                                        className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                                      >
                                        Counter
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setViewingOffersFor(null)}
                          className="mt-3 text-sm text-blue-600 hover:underline"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
