import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, data } = await req.json()

    let subject = ''
    let html = ''

    if (type === 'new_offer') {
      subject = `💰 New offer on: ${data.listing_title}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1d4ed8;">New offer received! 🎉</h2>
          <p>Hi ${data.seller_name},</p>
          <p><strong>${data.buyer_name}</strong> has made an offer on your listing:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">${data.listing_title}</h3>
            <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 0;">Offer: $${data.offer_amount}</p>
            ${data.listing_price ? `<p style="color: #6b7280; margin: 4px 0;">Asking price: $${data.listing_price}</p>` : ''}
          </div>
          <a href="https://wellesleyfinds.com/my-listings" 
             style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 16px 0;">
            View Offer →
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Wellesley Finds • Made with 💙 by Juliette Bacuvier</p>
        </div>
      `
    } else if (type === 'offer_accepted') {
      subject = `✅ Your offer was accepted: ${data.listing_title}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Offer accepted! 🎉</h2>
          <p>Hi ${data.buyer_name},</p>
          <p><strong>${data.seller_name}</strong> accepted your offer on:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0;">${data.listing_title}</h3>
            <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 0;">$${data.offer_amount}</p>
          </div>
          <p><strong>Next steps:</strong></p>
          <ul>
            <li>Seller email: <a href="mailto:${data.seller_email}">${data.seller_email}</a></li>
            ${data.seller_phone ? `<li>Seller phone: ${data.seller_phone}</li>` : ''}
          </ul>
          <a href="https://wellesleyfinds.com/my-purchases" 
             style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 16px 0;">
            View My Purchases →
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Wellesley Finds • Made with 💙 by Juliette Bacuvier</p>
        </div>
      `
    } else if (type === 'new_message') {
      subject = `💬 New message about: ${data.listing_title}`
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1d4ed8;">New message! 💬</h2>
          <p>Hi ${data.recipient_name},</p>
          <p><strong>${data.sender_name}</strong> sent a message about <strong>${data.listing_title}</strong>:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #1d4ed8;">
            <p style="margin: 0; font-style: italic;">"${data.message}"</p>
          </div>
          <a href="https://wellesleyfinds.com/listing/${data.listing_id}" 
             style="background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 16px 0;">
            Reply →
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px;">Wellesley Finds • Made with 💙 by Juliette Bacuvier</p>
        </div>
      `
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Wellesley Finds <notifications@wellesleyfinds.com>',
        to: [to],
        subject,
        html,
      }),
    })

    const resData = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(resData))

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
