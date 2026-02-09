'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ListingPage() {
  const params = useParams()
  const listingId = params.id
  const router = useRouter()
  
  const [listing, setListing] = useState(null)
  const [seller, setSeller] = useState(null)
  const [user, setUser] = useState(null)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [offerAmount, setOfferAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      await fetchListing()
    }
    init()
  }, [listingId])

  useEffect(() => {
    if (listing && user) {
      fetchOrCreateConversation(user.id)
    }
  }, [listing, user])

  useEffect(() => {
    if (conversation) {
      fetchMessages()
      // Subscribe to new messages
      const channel = supabase
        .channel(`conversation-${conversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [conversation])

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single()

      if (error) throw error
      setListing(data)

      // Fetch seller profile separately
      if (data.user_id) {
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user_id)
          .single()
        
        setSeller(sellerData)
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrCreateConversation = async (userId) => {
    try {
      // Check if conversation exists
      let { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', userId)
        .single()

      if (existing) {
        setConversation(existing)
        return
      }

      // Seller viewing their own listing
      if (listing.user_id === userId) {
        return
      }

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{
          listing_id: listingId,
          buyer_id: userId,
          seller_id: listing.user_id
        }])
        .select()
        .single()

      if (createError) throw createError
      setConversation(newConv)
    } catch (error) {
      console.error('Error with conversation:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // Fetch sender names separately
      const messagesWithNames = await Promise.all((data || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', msg.sender_id)
          .single()
        
        return { ...msg, sender_name: profile?.name || 'Unknown' }
      }))
      
      setMessages(messagesWithNames)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversation) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          message: newMessage
        }])

      if (error) throw error
      setNewMessage('')
      await fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const makeOffer = async () => {
    if (!offerAmount || !conversation) return
    if (listing.is_sold) {
      alert('This item is already sold')
      return
    }

    try {
      const { error } = await supabase
        .from('offers')
        .insert([{
          conversation_id: conversation.id,
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: listing.user_id,
          amount: parseFloat(offerAmount),
          offered_by: 'buyer',
          status: 'pending'
        }])

      if (error) throw error

      // Send a message about the offer
      await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          message: `📝 Made an offer: $${offerAmount}`
        }])

      setOfferAmount('')
      alert('Offer sent!')
      await fetchMessages()
    } catch (error) {
      console.error('Error making offer:', error)
      alert('Failed to send offer')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!listing) {
    return <div className="min-h-screen flex items-center justify-center">Listing not found</div>
  }

  const isSeller = user && listing.user_id === user.id

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Marketplace</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Listing Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
            {listing.image_url && (
              <img src={listing.image_url} alt={listing.title} className="w-full h-64 object-cover rounded-md mb-4" />
            )}
            <p className="text-gray-700 mb-4">{listing.description}</p>
            
            <div className="space-y-2 mb-4">
              <p className="text-3xl font-bold text-green-600">
                {listing.is_free ? 'FREE' : `$${listing.price}`}
              </p>
              {listing.original_price && !listing.is_free && (
                <p className="text-sm text-gray-500 line-through">Original: ${listing.original_price}</p>
              )}
              <p className="text-sm text-gray-600"><strong>Category:</strong> {listing.category}</p>
              <p className="text-sm text-gray-600"><strong>Condition:</strong> {listing.condition}</p>
              <p className="text-sm text-gray-600"><strong>Location:</strong> {listing.dorm}</p>
              <p className="text-sm text-gray-600"><strong>Payment:</strong> {listing.payment_method}</p>
              {listing.available_on && (
                <p className="text-sm text-gray-600"><strong>Available:</strong> {listing.available_on}</p>
              )}
              {listing.needs_to_be_gone_by && (
                <p className="text-sm text-red-600 font-semibold">
                  <strong>Needs to be gone by:</strong> {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">Seller: {seller?.name || 'Unknown'}</p>
              {listing.is_sold && (
                <p className="text-red-600 font-bold mt-2">This item is SOLD</p>
              )}
            </div>
          </div>

          {/* Messaging Section */}
          {!isSeller && conversation && (
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col" style={{ height: '600px' }}>
              <h2 className="text-2xl font-bold mb-4">Message Seller</h2>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 border rounded-md p-4 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender_id === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-xs opacity-75 mb-1">{msg.sender_name}</p>
                      <p>{msg.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Send Message */}
              <form onSubmit={sendMessage} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </form>

              {/* Make Offer */}
              {!listing.is_sold && !listing.is_free && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Make an Offer</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <button
                      onClick={makeOffer}
                      disabled={!offerAmount}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Send Offer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isSeller && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">This is your listing</h2>
              <p className="text-gray-600">You can manage this listing from the "My Listings" page.</p>
              <Link href="/my-listings" className="text-blue-600 hover:underline mt-4 inline-block">
                Go to My Listings →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
