import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-6">
          Hmm, we could not find what you were looking for. It may have been removed or the link might be wrong.
        </p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition mb-6">
          Back to Marketplace
        </Link>
        <div className="border-t pt-5 text-sm text-gray-400">
          <p>Something broken? Contact me at</p>
          <a href="mailto:jbacuvier@wellesley.edu" className="text-blue-500 hover:underline font-medium">jbacuvier@wellesley.edu</a>
        </div>
      </div>
    </div>
  )
}
