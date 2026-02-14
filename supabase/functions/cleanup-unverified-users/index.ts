import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (fetchError) throw fetchError

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    let deletedCount = 0
    
    for (const user of users.users) {
      const createdAt = new Date(user.created_at)
      
      if (!user.email_confirmed_at && createdAt < oneDayAgo) {
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        deletedCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedCount,
        message: `Deleted ${deletedCount} unverified users` 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
