'use client'
import { useState } from 'react'

const steps = [
  {
    emoji: '👋',
    title: 'Welcome to Wellesley Finds!',
    description: 'Your one-stop shop for buying and selling within the Wellesley community. Here\'s a quick tour to get you started!',
  },
  {
    emoji: '🛍️',
    title: 'Browse Listings',
    description: 'The home page shows all available items. Use the search bar, category filters, and sort options to find exactly what you\'re looking for. Items from seniors and students leaving soon appear first!',
  },
  {
    emoji: '❤️',
    title: 'Like Items',
    description: 'Click the heart on any listing to save it to your Liked Items page. This helps you keep track of items you\'re interested in and lets sellers know there\'s interest!',
  },
  {
    emoji: '💬',
    title: 'Message & Make Offers',
    description: 'Click "Message / Make Offer" on any listing to open a chat with the seller. You can ask questions, negotiate, and make offers directly. Sellers can accept, reject, or counter your offers!',
  },
  {
    emoji: '📦',
    title: 'Create a Listing',
    description: 'Have something to sell? Click "Create Listing" in the navigation bar. Add photos, set your price, choose a condition, and set a pickup location. You can upload up to 5 photos!',
  },
  {
    emoji: '🔔',
    title: 'Stay Notified',
    description: 'You\'ll receive email notifications when someone messages you, makes an offer, or when your offer is accepted. You can turn these off anytime in your Profile settings.',
  },
  {
    emoji: '⚠️',
    title: 'Community Rules',
    description: 'This platform is for legal goods only. Be honest, be kind, and honor your commitments. Violations will be reported to administration and law enforcement. Let\'s keep Wellesley Finds safe for everyone!',
  },
  {
    emoji: '🎉',
    title: 'You\'re all set!',
    description: 'Welcome to the Wellesley Finds community! Start by completing your profile, then browse listings or create your first one. Happy buying and selling! 💙',
  },
]

export default function OnboardingModal({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)

  const isLast = currentStep === steps.length - 1
  const step = steps[currentStep]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? 'bg-blue-600 w-4' : i < currentStep ? 'bg-blue-300' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{step.emoji}</div>
          <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
          <p className="text-gray-600 leading-relaxed">{step.description}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-md hover:bg-gray-50 font-medium"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) {
                onComplete()
              } else {
                setCurrentStep(currentStep + 1)
              }
            }}
            className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            {isLast ? "Let's go! 🚀" : 'Next →'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full text-center text-gray-400 hover:text-gray-600 text-sm mt-4 hover:underline"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  )
}
