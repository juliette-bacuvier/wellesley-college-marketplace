'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfileSetupModal({ userId, onComplete }) {
  const [name, setName] = useState('')
  const [classYear, setClassYear] = useState('')
  const [graduationTerm, setGraduationTerm] = useState('')
  const [phone, setPhone] = useState('')
  const [dorm, setDorm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim() || !classYear || !dorm) {
      setMessage('Please fill in your name, class year, and dorm.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          class_year: classYear,
          graduation_term: graduationTerm || null,
          dorm: dorm || null,
          phone: phone.trim() || null,
        })
        .eq('id', userId)
      if (error) throw error
      onComplete()
    } catch (error) {
      setMessage('Error saving profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h2 className="text-2xl font-bold text-blue-900">Welcome to the Wellesley Finds!</h2>
          <p className="text-gray-500 mt-2 text-sm">Let's set up your profile so other students know who they're buying from.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. Jane Smith"
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
            <label className="block text-sm font-medium mb-1">Your Dorm *</label>
            <select
              value={dorm}
              onChange={(e) => setDorm(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select your dorm</option>
              {['Bates', 'Beebe', 'Casa Cervantes', 'Cazenove', 'Claflin', 'Freeman', 'French House', 'Lake House', 'McAfee', 'Munger', 'Pomeroy', 'Severance', 'Shafer', 'Stone Davis', 'Tower Court East', 'Tower Court West'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Any country format"
            />
            <p className="text-xs text-gray-400 mt-1">Only shown to buyers if you choose to include it on a listing</p>
          </div>

          {message && <p className="text-red-600 text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save & Go to Marketplace →'}
          </button>

          <button
            type="button"
            onClick={onComplete}
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-1"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}
