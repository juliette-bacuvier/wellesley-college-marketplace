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
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const router = useRouter()

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://wellesleyfinds.com/auth/reset-password'
      })
      if (error) throw error
      setResetMessage('Password reset email sent! Check your inbox.')
    } catch (error) {
      setResetMessage('Error: ' + error.message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/?setup=true',
          queryParams: {
            hd: 'wellesley.edu'
          }
        }
      })
      if (error) throw error
    } catch (error) {
      setMessage('Error: ' + error.message)
      setMessageType('error')
    }
  }

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
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (existingUser) {
          setMessage('An account with this email already exists. Please sign in instead.')
          setMessageType('error')
          setLoading(false)
          return
        }

        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
            setMessage('An account with this email already exists. Please sign in instead.')
          } else {
            setMessage(error.message)
          }
          setMessageType('error')
          setLoading(false)
          return
        }
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

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/" className="text-xl font-bold">Wellesley Finds</Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
            <h1 className="text-3xl font-bold mb-2 text-center">Reset Password</h1>
            <p className="text-gray-500 text-center mb-6">Enter your @wellesley.edu email and we'll send you a reset link.</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="yourname@wellesley.edu"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              {resetMessage && (
                <p className={`text-center text-sm ${resetMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                  {resetMessage}
                </p>
              )}
            </form>
            <button
              onClick={() => { setShowForgotPassword(false); setResetMessage(''); setResetEmail('') }}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm hover:underline block w-full text-center"
            >
              Back to Sign In
            </button>
          </div>
        </div>
        <footer className="bg-white border-t py-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          </div>
        </footer>
      </div>
    )
  }

  if (message === 'go_check_email') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/" className="text-xl font-bold">Wellesley Finds</Link>
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
          <Link href="/" className="text-xl font-bold">Wellesley Finds</Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-500 text-center mb-6">
            {isSignUp ? 'Join the Wellesley Finds' : 'Sign in to your account'}
          </p>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign {isSignUp ? 'up' : 'in'} with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

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

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-center text-sm text-gray-500 hover:text-blue-600 hover:underline"
              >
                Forgot your password?
              </button>
            )}

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
