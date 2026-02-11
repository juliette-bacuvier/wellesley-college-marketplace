'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [includePhone, setIncludePhone] = useState(false)
  const [isFree, setIsFree] = useState(false)
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [isDraft, setIsDraft] = useState(false)
  const router = useRouter()

  const categories = [
    'Bedding & Pillows',
    'Books & Stationery',
    'Clothing',
    'Decor',
    'Electronics',
    'Furniture',
    'Kitchen & Appliances',
    'Office Essentials',
    'Other',
    'Sports & Fitness',
    'Storage & Organization',
    'Textbooks',
  ]

  const dorms = [
    'Cazenove', 'Shafer', 'Pomeroy', 'Beebe', 'Tower Court East',
    'Tower Court West', 'Severance', 'Claflin', 'Lake House',
    'Casa Cervantes', 'French House', 'Stone Davis', 'Bates',
    'McAfee', 'Freeman', 'Munger'
  ]

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('phone, dorm')
          .eq('id', user.id)
          .single()
        if (data?.phone) setUserPhone(data.phone)
        if (data?.dorm) setDorm(data.dorm)
      }
    }
    fetchUserProfile()
  }, [])

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 5) {
      alert('Maximum 5 images allowed')
      return
    }
    setImages(files)
    const previews = files.map(file => URL.createObjectURL(file))
    setImagePreviews(previews)
  }

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImages(newImages)
    setImagePreviews(newPreviews)
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

      // Upload first image as main image_url
      let mainImageUrl = null
      const uploadedUrls = []

      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        const fileExt = image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}-${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, image)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
        if (i === 0) mainImageUrl = publicUrl
      }

      // Create listing
      const { data: newListing, error: insertError } = await supabase
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
          image_url: mainImageUrl,
          is_free: isFree,
          is_negotiable: isNegotiable,
          is_draft: isDraft
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Insert additional images into listing_images table
      if (uploadedUrls.length > 0) {
        const imageRows = uploadedUrls.map((url, index) => ({
          listing_id: newListing.id,
          image_url: url,
          display_order: index
        }))

        await supabase
          .from('listing_images')
          .insert(imageRows)
      }

      setMessage(isDraft ? 'Draft saved!' : 'Listing created successfully!')
      setTimeout(() => router.push('/my-listings'), 1500)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Create New Listing</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Back to Home
          </Link>
        </div>

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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="negotiable"
              checked={isNegotiable}
              onChange={(e) => setIsNegotiable(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="negotiable" className="text-sm font-medium text-purple-700">
              Price is negotiable
            </label>
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
              placeholder="e.g., Weekdays after 5pm"
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
            <p className="text-xs text-gray-500 mt-1">Optional: Set a deadline to prioritize your listing</p>
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
            <label className="block text-sm font-medium mb-1">
              Upload Images (up to 5)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">First image will be the main photo</p>

            {imagePreviews.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-16 object-cover rounded-md border"
                    />
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 text-center bg-blue-600 text-white text-xs rounded-b-md">Main</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              onClick={() => setIsDraft(false)}
              className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loading && !isDraft ? 'Publishing...' : '🚀 Publish Listing'}
            </button>
            <button
              type="submit"
              disabled={loading}
              onClick={() => setIsDraft(true)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-md hover:bg-gray-200 disabled:opacity-50 font-semibold border"
            >
              {loading && isDraft ? 'Saving...' : '📝 Save as Draft'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-1"
          >
            Cancel
          </button>

          {message && (
            <p className={`text-center text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </form>
      </div>

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
