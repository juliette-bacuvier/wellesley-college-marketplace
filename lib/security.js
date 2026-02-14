/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validates Wellesley email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid Wellesley email
 */
export function isValidWellesleyEmail(email) {
  if (!email || typeof email !== 'string') return false
  
  // Strict email validation for @wellesley.edu domain
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@wellesley\.edu$/
  
  // Additional checks
  const hasValidFormat = emailRegex.test(email)
  const noConsecutiveDots = !email.includes('..')
  const noLeadingDot = !email.startsWith('.')
  const noTrailingDot = !email.endsWith('@wellesley.edu.')
  
  return hasValidFormat && noConsecutiveDots && noLeadingDot && noTrailingDot
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Validates price input
 * @param {number|string} price - Price to validate
 * @returns {boolean} - True if valid price
 */
export function isValidPrice(price) {
  const numPrice = parseFloat(price)
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 10000
}

/**
 * Validates listing title
 * @param {string} title - Title to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateListingTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' }
  }
  
  const trimmed = title.trim()
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Title must be at least 3 characters' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Title must be less than 100 characters' }
  }
  
  // Check for suspicious patterns
  if (/<script|javascript:|onerror=/i.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in title' }
  }
  
  return { valid: true, error: null }
}

/**
 * Validates listing description
 * @param {string} description - Description to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateDescription(description) {
  if (!description) {
    return { valid: true, error: null } // Description is optional
  }
  
  if (typeof description !== 'string') {
    return { valid: false, error: 'Invalid description format' }
  }
  
  const trimmed = description.trim()
  
  if (trimmed.length > 1000) {
    return { valid: false, error: 'Description must be less than 1000 characters' }
  }
  
  // Check for suspicious patterns
  if (/<script|javascript:|onerror=/i.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in description' }
  }
  
  return { valid: true, error: null }
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' }
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' }
  }
  
  // Check for at least one number and one letter
  const hasNumber = /\d/.test(password)
  const hasLetter = /[a-zA-Z]/.test(password)
  
  if (!hasNumber || !hasLetter) {
    return { valid: false, error: 'Password must contain letters and numbers' }
  }
  
  return { valid: true, error: null }
}

/**
 * Rate limiting helper - simple client-side implementation
 * Note: Server-side rate limiting should also be implemented
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
    this.attempts = new Map()
  }
  
  /**
   * Check if action is allowed
   * @param {string} key - Unique identifier for the action
   * @returns {boolean} - True if action is allowed
   */
  isAllowed(key) {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs)
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false
    }
    
    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    return true
  }
  
  /**
   * Reset attempts for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.attempts.delete(key)
  }
}

/**
 * Escape HTML to prevent XSS when rendering user content
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export function escapeHtml(text) {
  if (!text) return ''
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return String(text).replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validates file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateFileUpload(file, options = {}) {
  const {
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  } = options
  
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload an image (JPEG, PNG, or WebP)' }
  }
  
  return { valid: true, error: null }
}
