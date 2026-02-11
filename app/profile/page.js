'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [classYear, setClassYear] = useState('')
  const [graduationTerm, setGraduationTerm] = useState('')
  const [dorm, setDorm] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      setEmail(user.email)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setName(data.name || '')
        setPhone(data.phone || '')
        setClassYear(data.class_year || '')
        setGraduationTerm(data.graduation_term || '')
        setDorm(data.dorm || '')
        setEmailNotifications(data.email_notifications !== false)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          class_year: classYear,
          graduation_term: graduationTerm,
          dorm,
          email_notifications: emailNotifications
        })
        .eq('id', user.id)

      if (error) throw error
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error updating profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">Back to Home</Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">Profile Information</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Class Year *</label>
              <select
                value={classYear}
                onChange={(e) => setClassYear(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select class year</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
                <option value="Exchange">Exchange Student</option>
                <option value="Graduate">Graduate Student</option>
              </select>
            </div>

            {classYear && !['Exchange', 'Graduate'].includes(classYear) && (
              <div>
                <label className="block text-sm font-medium mb-1">Graduation Term *</label>
                <select
                  value={graduationTerm}
                  onChange={(e) => setGraduationTerm(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select term</option>
                  <option value="Winter">Winter</option>
                  <option value="Spring">Spring</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Your Dorm</label>
              <select
                value={dorm}
                onChange={(e) => setDorm(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select dorm</option>
                {['Bates', 'Beebe', 'Casa Cervantes', 'Cazenove', 'Claflin', 'Freeman', 'French House', 'Lake House', 'McAfee', 'Munger', 'Pomeroy', 'Severance', 'Shafer', 'Stone Davis', 'Tower Court East', 'Tower Court West'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Will be auto-filled when you create a listing</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Phone number (any country)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your phone will be visible to buyers when you create listings
              </p>
            </div>

            <div className="border rounded-md p-4 bg-gray-50">
              <h3 className="font-medium mb-3">📧 Email Notifications</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium">Receive email notifications</p>
                  <p className="text-xs text-gray-500">Get notified about new offers, messages, and accepted offers</p>
                </div>
              </label>
              {!emailNotifications && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ You won't receive any email notifications. Make sure to check the app regularly!
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {message && (
              <p className={`text-center text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </form>
        </div>
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
