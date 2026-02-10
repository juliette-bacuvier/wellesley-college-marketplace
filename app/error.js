'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😬</div>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Oh no! Something went wrong.</h1>
        <p className="text-gray-500 mb-6">
          An unexpected error occurred. You can try again, or head back to the marketplace.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button onClick={reset} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition">Try Again</button>
          <Link href="/" className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Back to Marketplace</Link>
        </div>
        <div className="border-t pt-5 text-sm text-gray-400">
          <p>If this keeps happening, please reach out:</p>
          <a href="mailto:jbacuvier@wellesley.edu" className="text-blue-500 hover:underline font-medium">jbacuvier@wellesley.edu</a>
        </div>
      </div>
    </div>
  )
}
