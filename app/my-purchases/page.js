'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyPurchases() {
  const [purchases, setPurchases] = useState([])
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
      await fetchPurchases(user.id)
    }
    init()
  }, [])

  const fetchPurchases = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles!listings_user_id_fkey(name, email, phone)')
        .eq('buyer_id', userId)
        .eq('is_sold', true)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Purchases</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">
          Items You've Bought ({purchases.length})
        </h2>
        
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't purchased anything yet.</p>
            <Link href="/" className="text-blue-600 hover:underline">
              Browse Marketplace →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-2 text-sm">{item.description}</p>
                  
                  <div className="space-y-1 text-sm mb-3">
                    <p className="text-2xl font-bold text-green-600">
                      {item.is_free ? 'FREE' : `$${item.price}`}
                    </p>
                    <p className="text-gray-500">Condition: {item.condition}</p>
                    <p className="text-gray-500">📍 {item.dorm}</p>
                    {item.available_on && (
                      <p className="text-gray-500">Available: {item.available_on}</p>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <p className="text-sm font-semibold text-gray-700">Seller: {item.profiles?.name}</p>
                    <div className="flex flex-col gap-1">
                      <a 
                        href={`mailto:${item.profiles?.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        📧 {item.profiles?.email}
                      </a>
                      {item.profiles?.phone && (
                        <>
                          <a 
                            href={`tel:${item.profiles?.phone}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            📱 {item.profiles?.phone}
                          </a>
                          <a 
                            href={`sms:${item.profiles?.phone}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            💬 Text Seller
                          </a>
                        </>
                      )}
                    </div>
                  </div>
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
