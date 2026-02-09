'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreateListing() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [condition, setCondition] = useState('good')
  const [category, setCategory] = useState('')
  const [dorm, setDorm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [availableOn, setAvailableOn] = useState('')
  const [needsToBeGoneBy, setNeedsToBeGoneBy] = useState('') 
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [includePhone, setIncludePhone] = useState(false)
  const [isFree, setIsFree] = useState(false)
  const router = useRouter()

  const categories = [
    'Textbooks',
    'Furniture',
    'Electronics',
    'Clothing',
    'Kitchen & Appliances',
    'Decor',
    'Sports & Fitness',
    'Other'
  ]

  const dorms = [
    'Cazenove',
    'Shafer',
    'Pomeroy',
    'Beebe',
    'Tower Court East',
    'Tower Court West',
    'Severance',
    'Claflin',
    'Lake House',
    'Casa Cervantes',
    'French House',
    'Stone Davis',
    'Bates',
    'McAfee',
    'Freeman',
    'Munger'
  ]

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single()
        
        if (data?.phone) {
          setUserPhone(data.phone)
        }
      }
    }
    fetchUserProfile()
  }, [])

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (includePhone && userPhone) {
        await supabase
          .from('profiles')
          .update({ phone: userPhone })
          .eq('id', user.id)
      }

      let imageUrl = null

      if (image) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, image)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      const { error: insertError } = await supabase
        .from('listings')
        .insert([{
          user_id: user.id,
          title,
          description,
          price: isFree ? 0 : parseFloat(price),
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          condition,
          category,
          dorm,
          payment_method: paymentMethod,
          available_on: availableOn,
	  needs_to_be_gone_by: needsToBeGoneBy || null,
          image_url: imageUrl,
          is_free: isFree
        }])

      if (insertError) throw insertError

      setMessage('Listing created successfully!')
      setTimeout(() => router.push('/'), 1500)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., Mini Fridge"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows="3"
              placeholder="Details about the item..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dorm *</label>
              <select
                value={dorm}
                onChange={(e) => setDorm(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
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
              <label className="block text-sm font-medium mb-1">Price ($) *</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required={!isFree}
                  disabled={isFree}
                  className="flex-1 px-3 py-2 border rounded-md disabled:bg-gray-100"
                  placeholder="50.00"
                />
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => {
                      setIsFree(e.target.checked)
                      if (e.target.checked) setPrice('0')
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
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="100.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Condition *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
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
              value={availableOn}
              onChange={(e) => setAvailableOn(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., Weekdays after 5pm, May 10-15"
            />
          </div>

<div>
  <label className="block text-sm font-medium mb-1">Needs to be gone by</label>
  <input
    type="date"
    value={needsToBeGoneBy}
    onChange={(e) => setNeedsToBeGoneBy(e.target.value)}
    className="w-full px-3 py-2 border rounded-md"
  />
  <p className="text-xs text-gray-500 mt-1">Optional: Set a deadline to prioritize this listing</p>
</div>	

          <div>
            <label className="block text-sm font-medium mb-1">Payment Method *</label>
            <input
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., Venmo, Cash, Zelle"
            />
          </div>

          <div className="border rounded-md p-4 bg-gray-50">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={includePhone}
                onChange={(e) => setIncludePhone(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Include phone number for contact</span>
            </label>
            {includePhone && (
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Phone number (any country)"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Listing'}
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {message && (
            <p className={`text-center text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
