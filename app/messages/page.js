'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MessagesPage() {
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUser(user)
      fetchConversations(user.id)
    })
  }, [])

  const fetchConversations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          listings(id, title, image_url, is_sold),
          buyer:profiles!conversations_buyer_id_fkey(id, name),
          seller:profiles!conversations_seller_id_fkey(id, name)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Get last message and unread count for each conversation
      const convosWithDetails = await Promise.all((data || []).map(async (conv) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const { data: unreadData } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', userId)

        return {
          ...conv,
          lastMessage: messages?.[0] || null,
          unreadCount: unreadData?.length || 0
        }
      }))

      setConversations(convosWithDetails)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Messages</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">Back to Home</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No messages yet</h2>
            <p className="text-gray-500 mb-6">When you message a seller or a buyer contacts you, it'll show up here.</p>
            <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const isBuyer = user && conv.buyer?.id === user.id
              const otherPerson = isBuyer ? conv.seller : conv.buyer
              const image = conv.listings?.image_url

              return (
                <Link
                  key={conv.id}
                  href={`/listing/${conv.listings?.id}`}
                  className="block bg-white rounded-xl shadow-sm hover:shadow-md transition p-4"
                >
                  <div className="flex items-center gap-4">
                    {image ? (
                      <img src={image} alt={conv.listings?.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{conv.listings?.title}</h3>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 flex-shrink-0">{conv.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        {isBuyer ? `Seller: ${otherPerson?.name}` : `Buyer: ${otherPerson?.name}`}
                        {conv.listings?.is_sold && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">SOLD</span>}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-400 truncate">
                          {conv.lastMessage.message}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {conv.lastMessage && new Date(conv.lastMessage.created_at).toLocaleDateString()}
                    </div>
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
