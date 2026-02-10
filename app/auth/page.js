'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [agreedToRules, setAgreedToRules] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [signUpEmail, setSignUpEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const router = useRouter()

  const handleAuth = async (e) => {
    e.preventDefault()
    if (isSignUp && !agreedToRules) {
      setMessage('You must agree to the community guidelines to sign up.')
      setMessageType('error')
      return
    }
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        if (!email.endsWith('@wellesley.edu')) {
          setMessage('You must use a @wellesley.edu email address to sign up.')
          setMessageType('error')
          setLoading(false)
          return
        }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSignUpEmail(email)
        setMessage('go_check_email')
        setMessageType('success')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      }
    } catch (error) {
      setMessage(error.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setResendLoading(true)
    setResendMessage('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signUpEmail,
      })
      if (error) throw error
      setResendMessage('Email resent! Check your inbox.')
    } catch (error) {
      setResendMessage('Failed to resend: ' + error.message)
    } finally {
      setResendLoading(false)
    }
  }

  if (message === 'go_check_email') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/" className="text-xl font-bold">Wellesley Marketplace</Link>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md text-center">
            <div className="text-6xl mb-4">📬</div>
            <h2 className="text-3xl font-bold mb-3">Go check your email!</h2>
            <p className="text-gray-600 mb-2">
              We sent a verification link to:
            </p>
            <p className="font-bold text-blue-600 mb-6">{signUpEmail}</p>
            <p className="text-gray-500 text-sm mb-8">
              Click the link in the email to verify your account and get started. Don't forget to check your spam folder!
            </p>

            <div className="border-t pt-6">
              <p className="text-gray-500 text-sm mb-3">Didn't receive it?</p>
              <button
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {resendLoading ? 'Sending...' : '🔄 Resend Verification Email'}
              </button>
              {resendMessage && (
                <p className={`mt-3 text-sm ${resendMessage.includes('resent') ? 'text-green-600' : 'text-red-600'}`}>
                  {resendMessage}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setMessage('')
                setIsSignUp(false)
                setEmail('')
                setPassword('')
              }}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm hover:underline block w-full"
            >
              Back to Sign In
            </button>
          </div>
        </div>

        <footer className="bg-white border-t py-6">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
            <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
            <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
              ☕ Buy me a coffee!
            </a>
            <div>
              <a href="/terms" className="text-gray-400 hover:text-gray-600 text-xs hover:underline">Terms of Use</a>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold">Wellesley Marketplace</Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-500 text-center mb-6">
            {isSignUp ? 'Join the Wellesley Marketplace' : 'Sign in to your account'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="yourname@wellesley.edu"
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">Must be a @wellesley.edu email</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <div className="border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRules(!showRules)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                >
                  <span className="font-medium text-sm">📋 Community Guidelines & Code of Conduct</span>
                  <span className="text-gray-500">{showRules ? '▲' : '▼'}</span>
                </button>

                {showRules && (
                  <div className="px-4 py-4 text-sm text-gray-700 space-y-3 border-t bg-white max-h-64 overflow-y-auto">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">✅ Acceptable Use</h4>
                      <ul className="space-y-1 text-gray-600 list-disc list-inside">
                        <li>Only list items you personally own and have the right to sell</li>
                        <li>Provide accurate descriptions and photos of your items</li>
                        <li>Honor agreed-upon prices and pickup arrangements</li>
                        <li>Treat all community members with respect</li>
                        <li>Only use your @wellesley.edu email address</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">❌ Prohibited Items & Behavior</h4>
                      <ul className="space-y-1 text-gray-600 list-disc list-inside">
                        <li>No illegal goods, controlled substances, or drugs</li>
                        <li>No weapons, firearms, or dangerous items</li>
                        <li>No stolen property</li>
                        <li>No harassment, hate speech, or discriminatory behavior</li>
                        <li>No spam, scams, or fraudulent listings</li>
                        <li>No counterfeit or trademark-infringing items</li>
                      </ul>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <h4 className="font-bold text-red-800 mb-1">⚠️ Legal Warning</h4>
                      <p className="text-red-700 text-xs">
                        Trading illegal items, controlled substances, or stolen property is strictly prohibited. Violations will be reported to Wellesley College administration and law enforcement authorities. Users found in violation may face disciplinary action and/or criminal prosecution.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">🤝 Community Standards</h4>
                      <p className="text-gray-600">
                        This platform is built on trust within our Wellesley community. We expect all users to act in good faith, communicate honestly, and help maintain a safe and welcoming marketplace for everyone.
                      </p>
                    </div>
                  </div>
                )}

                <div className="px-4 py-3 bg-gray-50 border-t">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToRules}
                      onChange={(e) => setAgreedToRules(e.target.checked)}
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700">
                      I have read and agree to the Community Guidelines & Code of Conduct. I understand that violations may be reported to Wellesley College administration and law enforcement.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !agreedToRules)}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            {message && message !== 'go_check_email' && (
              <p className={`text-center text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage('')
                setAgreedToRules(false)
                setShowRules(false)
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>

      <footer className="bg-white border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
            ☕ Buy me a coffee!
          </a>
          <div>
            <a href="/terms" className="text-gray-400 hover:text-gray-600 text-xs hover:underline">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
