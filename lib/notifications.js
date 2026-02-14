/**
 * Secure email notification utility
 * Sends notifications via API route instead of directly from client
 */

/**
 * Send email notification
 * @param {string} type - Type of notification (offer_accepted, message_received, etc.)
 * @param {string} to - Recipient email address
 * @param {Object} data - Email template data
 * @returns {Promise<boolean>} - Success status
 */
export async function sendEmailNotification(type, to, data) {
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, to, data })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Email notification error:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Failed to send email notification:', error)
    return false
  }
}

/**
 * Notification types enum for type safety
 */
export const NotificationType = {
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_RECEIVED: 'offer_received',
  MESSAGE_RECEIVED: 'message_received',
  LISTING_SOLD: 'listing_sold',
  PRICE_DROP: 'price_drop',
}
