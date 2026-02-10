'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

export default function ConfirmPage() {
  const [status, setStatus] = useState('verifying')
  const router = useRouter()

  useEffect(() => {
    const handleConfirmation = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session) {
        setStatus('error')
      } else {
        setStatus('success')
        setTimeout(() => router.push('/'), 3000)
      }
    }
    handleConfirmation()
  }, [router])

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">Verifying your email...</h1>
            <p className="text-gray-500">Just a moment!</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">You're verified!</h1>
            <p className="text-gray-500 mb-6">Your Wellesley email has been confirmed. Redirecting you to the marketplace...</p>
            <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
              Go to Marketplace
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6">We could not verify your email. The link may have expired — try signing up again.</p>
            <Link href="/auth" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
              Back to Sign Up
            </Link>
            <div className="mt-4 text-sm text-gray-400">
              Still having trouble? Contact <a href="mailto:jbacuvier@wellesley.edu" className="text-blue-500 hover:underline">jbacuvier@wellesley.edu</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
