import { supabase } from '@/lib/supabase'

/**
 * Check if user is banned and sign them out if they are
 * @param {string} userId - The user's ID
 * @param {function} router - Next.js router instance
 * @returns {Promise<boolean>} - Returns true if user is banned, false otherwise
 */
export async function checkIfUserBanned(userId, router) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, banned_reason')
      .eq('id', userId)
      .single()
    
    if (profile?.is_banned) {
      await supabase.auth.signOut()
      alert(`Your account has been banned.\n\nReason: ${profile.banned_reason}\n\nIf you believe this is a mistake, please contact support.`)
      router.push('/auth')
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error checking banned status:', error)
    return false
  }
}
