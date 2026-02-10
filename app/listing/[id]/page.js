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
  const [images, setImages] = useState([])
  const [activeImage, setActiveImage] = useState(0)
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
      markMessagesAsRead()
      const channel = supabase
        .channel(`conversation-${conversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        }, async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.sender_id)
            .single()
          setMessages(prev => [...prev, { ...payload.new, sender_name: profile?.name || 'Unknown' }])
          markMessagesAsRead()
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
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

      // Fetch seller profile
      if (data.user_id) {
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user_id)
          .single()
        setSeller(sellerData)
      }

      // Fetch all images
      const { data: listingImages } = await supabase
        .from('listing_images')
        .select('image_url, display_order')
        .eq('listing_id', listingId)
        .order('display_order', { ascending: true })

      if (listingImages && listingImages.length > 0) {
        setImages(listingImages.map(img => img.image_url))
      } else if (data.image_url) {
        setImages([data.image_url])
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrCreateConversation = async (userId) => {
    try {
      let { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', userId)
        .single()

      if (existing) {
        setConversation(existing)
        return
      }

      if (listing.user_id === userId) return

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

  const markMessagesAsRead = async () => {
    if (!conversation || !user) return
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversation.id)
        .neq('sender_id', user.id)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
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

            {/* Image Gallery */}
            {images.length > 0 && (
              <div className="mb-4">
                <img
                  src={images[activeImage]}
                  alt={listing.title}
                  className="w-full h-64 object-cover rounded-md mb-2"
                />
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`${listing.title} ${index + 1}`}
                        onClick={() => setActiveImage(index)}
                        className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 flex-shrink-0 ${
                          activeImage === index ? 'border-blue-600' : 'border-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-gray-700 mb-4">{listing.description}</p>

            <div className="space-y-2 mb-4">
              <p className="text-3xl font-bold text-green-600">
                {listing.is_free ? 'FREE' : `$${listing.price}`}
              </p>
              {listing.original_price && !listing.is_free && (
                <p className="text-sm text-gray-500 line-through">Original: ${listing.original_price}</p>
              )}
              {listing.is_negotiable && (
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  💜 Negotiable
                </span>
              )}
              <div className="flex gap-2 flex-wrap mt-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{listing.category}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  listing.condition === 'new' ? 'bg-green-100 text-green-800' :
                  listing.condition === 'like_new' ? 'bg-green-100 text-green-700' :
                  listing.condition === 'good' ? 'bg-yellow-100 text-yellow-800' :
                  listing.condition === 'fair' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {listing.condition === 'like_new' ? 'Like New' : listing.condition?.charAt(0).toUpperCase() + listing.condition?.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600">📍 {listing.dorm}</p>
              <p className="text-sm text-gray-600">💳 {listing.payment_method}</p>
              {listing.available_on && (
                <p className="text-sm text-gray-600">📅 Available: {listing.available_on}</p>
              )}
              {listing.needs_to_be_gone_by && (
                <p className="text-sm text-red-600 font-semibold">
                  ⚠️ Needs to be gone by: {new Date(listing.needs_to_be_gone_by).toLocaleDateString()}
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

              <div className="flex-1 overflow-y-auto mb-4 space-y-3 border rounded-md p-4 bg-gray-50">
                {messages.length === 0 && (
                  <p className="text-gray-400 text-sm text-center">No messages yet. Say hi! 👋</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.sender_id === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-xs opacity-75 mb-1">{msg.sender_name}</p>
                      <p>{msg.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

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

              {!listing.is_sold && !listing.is_free && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">
                    Make an Offer
                    {listing.is_negotiable && <span className="ml-2 text-xs text-purple-600">(Seller is open to offers!)</span>}
                  </h3>
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
