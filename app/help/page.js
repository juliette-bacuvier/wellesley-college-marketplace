'use client'
import Link from 'next/link'

export default function Help() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Help & Guide</h1>
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
          <section>
            <h2 className="text-3xl font-bold mb-4">👋 Welcome!</h2>
            <p className="text-gray-700 mb-4">
              <strong>Hi sibs! I'm Juliette</strong>, a Senior double majoring in Data Science and International Relations - PoliSci, graduating in May 2026.
            </p>
            <p className="text-gray-700 mb-4">
              I created this marketplace because I realized there wasn't a dedicated space for us Wellesley students to buy and sell items within our campus community. Whether you're graduating and need to offload furniture, hunting for affordable textbooks, or just looking to give your mini fridge a new home, this is your one-stop shop! 💙
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
              <p className="text-sm text-gray-700">
                <strong>⚠️ Important:</strong> This is a community platform for connecting buyers and sellers. I am not responsible for any issues with products, transactions, or payments. All sales are between students directly - use your best judgment and stay safe!
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-3">🛍️ Buying Items</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-lg mb-2">Browse & Discover</h4>
                <p className="text-gray-700">Use the search bar to find specific items, or filter by category and dorm location to see what's nearby!</p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Save Your Faves 💕</h4>
                <p className="text-gray-700">Click the heart icon to like items you're interested in. You can see how many people have liked something to gauge demand.</p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Connect with Sellers</h4>
                <p className="text-gray-700">Ready to buy? Click "Message Seller / Make Offer" to start a conversation, or reach out directly via email, call, or text if they've shared their contact info.</p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Sold Items</h4>
                <p className="text-gray-700">Items marked as sold will appear in grayscale with "SOLD" across them. They automatically disappear from the marketplace after 30 days.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-3">💰 Selling Items</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-lg mb-2">Create Your Listing</h4>
                <p className="text-gray-700 mb-2">Click "Create Listing" and fill out the form:</p>
                <ul className="list-none text-gray-700 space-y-1 ml-4">
                  <li>📝 <strong>Title</strong> - Clear, catchy name for your item ✨</li>
                  <li>📋 <strong>Description</strong> - Condition details, dimensions, or anything relevant</li>
                  <li>🗂️ <strong>Category</strong> - Textbooks, Furniture, Electronics, etc.</li>
                  <li>🏠 <strong>Dorm</strong> - Your current dorm for easy pickup</li>
                  <li>💵 <strong>Price</strong> - What you're asking (or check "Free"!)</li>
                  <li>💸 <strong>Original Price</strong> (optional) - Show buyers the value</li>
                  <li>⭐ <strong>Condition</strong> - New, Like New, Good, Fair, or Poor</li>
                  <li>📅 <strong>Available for Pickup</strong> - When buyers can grab it (e.g., "Weekdays after 5pm")</li>
                  <li>⏰ <strong>Needs to be gone by</strong> (optional) - Set a deadline to prioritize your listing</li>
                  <li>💳 <strong>Payment Method</strong> - Venmo, Cash, Zelle, etc.</li>
                  <li>📸 <strong>Photo</strong> - A clear pic makes all the difference!</li>
                  <li>📱 <strong>Phone Number</strong> (optional) - For faster contact</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Manage Your Listings</h4>
                <p className="text-gray-700">Head to "My Listings" to:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>View and respond to offers 💬</li>
                  <li>Edit listing details</li>
                  <li>Mark items as sold</li>
                  <li>Archive listings you no longer need</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">Handle Offers</h4>
                <p className="text-gray-700">Buyers can send you offers through the messaging system. You can accept, reject, or send a counter-offer. When you accept an offer, the item automatically marks as sold!</p>
              </div>
            </div>
          </section>

          <section className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
            <h3 className="text-2xl font-bold mb-3 text-red-700">🚨 Safety Tips - PLEASE READ!</h3>
            <div className="space-y-2">
              <p className="text-red-900 font-semibold">⚠️ Meet Smart, Stay Safe:</p>
              <ul className="list-disc list-inside text-red-900 space-y-2 ml-4">
                <li><strong>Always</strong> meet in public, well-lit areas on campus</li>
                <li>Bring a friend if you're picking up larger items</li>
                <li>Inspect items carefully before paying</li>
                <li>Use secure payment methods (Venmo, Zelle, cash) - <strong>never share banking passwords or sensitive financial info</strong></li>
                <li>Trust your gut - if something feels off, it probably is</li>
                <li><strong>Only communicate with verified @wellesley.edu email addresses</strong></li>
                <li>Let someone know where you're going for pickups</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-3">💳 Payment Methods</h3>
            <p className="text-gray-700 mb-2">
              This platform <strong>does NOT</strong> process payments - all transactions happen directly between you and the other person.
            </p>
            <p className="text-gray-700 mb-2">Common options:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Venmo</li>
              <li>Zelle</li>
              <li>Cash</li>
              <li>PayPal</li>
            </ul>
          </section>

          <section>
            <h3 className="text-2xl font-bold mb-3">💡 Quick Tips for Success</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Take clear, well-lit photos 📷</li>
              <li>Price fairly - check similar listings for reference</li>
              <li>Respond to messages promptly ⚡</li>
              <li>Be honest about item condition</li>
              <li>Update your listings when items sell</li>
              <li>Keep your profile info current</li>
            </ul>
          </section>

          <section className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <h3 className="text-2xl font-bold mb-3">🆘 Need Help?</h3>
            <p className="text-gray-700 mb-3">
              If you run into any issues, have questions, or encounter an error:
            </p>
            <p className="text-gray-900 font-semibold mb-2">
              📧 Email me at: <a href="mailto:jb122@wellesley.edu" className="text-blue-600 hover:underline">jb122@wellesley.edu</a>
            </p>
            <p className="text-gray-700 text-sm mb-4">
              If you see an error message, please <strong>screenshot it</strong> and attach it to your email so I can help fix it faster!
            </p>
            <div className="border-t pt-4 mt-4">
              <p className="text-gray-700 mb-2">Want to share feedback or suggestions? Fill out this quick form:</p>
              <a 
                href="https://forms.gle/Gvjxcn8QHJGYykY19" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                📝 Submit Feedback
              </a>
	    </div>
          </section>

          <div className="text-center pt-6 border-t">
            <p className="text-2xl font-bold text-gray-800">Happy buying and selling, sibs! 🎉</p>
          </div>
        </div>
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
