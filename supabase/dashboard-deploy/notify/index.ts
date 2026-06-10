// ════════════════════════════════════════════════════════════
// VERSION AUTONOME (tout-en-un) de l'Edge Function `notify`,
// pensée pour un déploiement par COPIER-COLLER dans l'éditeur web
// Supabase (aucun fichier _shared à gérer).
//
// → Dashboard → Edge Functions → Deploy a new function → nom : notify
//   → colle TOUT ce fichier → Deploy.
//
// Le code canonique (multi-fichiers, pour le CLI) reste dans
// supabase/functions/notify/. Garde les deux en phase si tu modifies l'un.
// ════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM = Deno.env.get('EMAIL_FROM') ?? 'BARBER95 <onboarding@resend.dev>'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? ''

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY manquant — email non envoyé')
    return { skipped: true }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return await res.json()
}

function layout(titre: string, contenu: string) {
  return `
  <div style="background:#111111;padding:40px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid #2a2a2a;">
        <span style="font-size:22px;font-weight:800;letter-spacing:3px;color:#e8e6e0;">BARBER<span style="color:#b5a76a;">95</span></span>
      </div>
      <div style="padding:32px;color:#e8e6e0;">
        <h1 style="font-size:22px;margin:0 0 16px;color:#e8e6e0;">${titre}</h1>
        ${contenu}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #2a2a2a;color:#6b6862;font-size:12px;">
        BARBER95 · Coiffeur · Val-d'Oise (95)
      </div>
    </div>
  </div>`
}

function bouton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#b5a76a;color:#1a1a1a;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:2px;letter-spacing:1px;margin-top:8px;">${label}</a>`
}

function formatDateFr(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  })
}

function googleCalLink(debutISO: string, finISO: string, titre = 'Coupe — BARBER95') {
  const fmt = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dates = `${fmt(new Date(debutISO).toISOString())}/${fmt(new Date(finISO).toISOString())}`
  const u = new URL('https://calendar.google.com/calendar/render')
  u.searchParams.set('action', 'TEMPLATE')
  u.searchParams.set('text', titre)
  u.searchParams.set('dates', dates)
  return u.toString()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, reservationId, siteUrl } = await req.json()
    const site = siteUrl || Deno.env.get('SITE_URL') || ''

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: resa, error } = await admin
      .from('reservations')
      .select('id, statut, clients(prenom, email, ref_code), creneaux(datetime_debut, datetime_fin)')
      .eq('id', reservationId)
      .single()
    if (error) throw error

    const prenom = resa.clients?.prenom || 'Client'
    const email = resa.clients?.email
    const debut = resa.creneaux?.datetime_debut
    const fin = resa.creneaux?.datetime_fin
    const quand = debut ? formatDateFr(debut) : ''

    if (type === 'confirmation') {
      if (email) {
        await sendEmail(
          email,
          'Ton rendez-vous est confirmé — BARBER95',
          layout(
            'Rendez-vous confirmé',
            `<p style="color:#e8e6e0;line-height:1.6;">Salut ${prenom}, ta coupe est réservée :</p>
             <p style="font-size:18px;color:#b5a76a;font-weight:bold;text-transform:capitalize;">${quand}</p>
             <p style="color:#6b6862;font-size:14px;line-height:1.6;">Tu peux annuler jusqu'à 2h avant depuis ton espace.</p>
             <p>${debut && fin ? bouton(googleCalLink(debut, fin), 'Ajouter à mon agenda') : ''}</p>`
          )
        )
      }
      if (ADMIN_EMAIL) {
        await sendEmail(
          ADMIN_EMAIL,
          `Nouvelle réservation — ${prenom}`,
          layout(
            'Nouvelle réservation',
            `<p style="color:#e8e6e0;">${prenom} a réservé une coupe :</p>
             <p style="font-size:18px;color:#b5a76a;font-weight:bold;text-transform:capitalize;">${quand}</p>`
          )
        )
      }
    } else if (type === 'annulation') {
      if (email) {
        await sendEmail(
          email,
          'Rendez-vous annulé — BARBER95',
          layout(
            'Rendez-vous annulé',
            `<p style="color:#e8e6e0;line-height:1.6;">Salut ${prenom}, ton rendez-vous du
             <strong style="text-transform:capitalize;">${quand}</strong> a bien été annulé.</p>
             <p style="color:#6b6862;font-size:14px;">À bientôt sur BARBER95.</p>
             <p>${bouton(site + '/reserver', 'Reprendre un créneau')}</p>`
          )
        )
      }
      if (ADMIN_EMAIL) {
        await sendEmail(
          ADMIN_EMAIL,
          `Annulation — ${prenom}`,
          layout('Annulation', `<p style="color:#e8e6e0;">${prenom} a annulé son RDV du ${quand}.</p>`)
        )
      }
    } else if (type === 'avis') {
      if (email) {
        const lien = `${site}/avis/nouveau?r=${reservationId}`
        await sendEmail(
          email,
          'Ton avis sur ta coupe ? — BARBER95',
          layout(
            'Alors, cette coupe ?',
            `<p style="color:#e8e6e0;line-height:1.6;">Salut ${prenom}, merci d'être passé !
             Laisse un avis en 10 secondes, ça aide énormément.</p>
             <p>${bouton(lien, 'Laisser un avis')}</p>`
          )
        )
      }
    } else if (type === 'parrainage') {
      const refCode = resa.clients?.ref_code
      if (email && refCode) {
        const lien = `${site}/ref/${refCode}`
        await sendEmail(
          email,
          'Recommande un pote, gagne un point — BARBER95',
          layout(
            'Recommande un pote',
            `<p style="color:#e8e6e0;line-height:1.6;">Salut ${prenom}, merci d'être passé !
             Un pote qui a besoin d'une coupe ? Envoie-lui ton lien perso :
             s'il réserve sa première coupe avec, tu gagnes <strong style="color:#b5a76a;">+1 point fidélité</strong>.</p>
             <p style="font-size:13px;color:#6b6862;word-break:break-all;">${lien}</p>
             <p>${bouton(lien, 'Mon lien à partager')}</p>`
          )
        )
      }
    } else {
      throw new Error('type inconnu')
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
