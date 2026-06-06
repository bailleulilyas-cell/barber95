// ════════════════════════════════════════════════════════════
// Edge Function `notify` — envoie les emails transactionnels.
// Appelée depuis le client après une action (confirmation, annulation,
// demande d'avis). Récupère les données via la clé service_role.
//
// Body attendu : { type: 'confirmation'|'annulation'|'avis', reservationId, siteUrl }
// ════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  sendEmail,
  layout,
  bouton,
  formatDateFr,
  googleCalLink,
  ADMIN_EMAIL,
} from '../_shared/email.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, reservationId, siteUrl } = await req.json()
    const site = siteUrl || Deno.env.get('SITE_URL') || ''

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // récupère la réservation + client + créneau
    const { data: resa, error } = await admin
      .from('reservations')
      .select('id, statut, clients(prenom, email), creneaux(datetime_debut, datetime_fin)')
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
      // notification à Adam
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
    } else {
      throw new Error('type inconnu')
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
