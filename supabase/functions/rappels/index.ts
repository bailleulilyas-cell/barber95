// ════════════════════════════════════════════════════════════
// Edge Function `rappels` — à planifier toutes les 5 min (cron).
// Envoie un email de rappel ~30 min avant chaque RDV confirmé.
// Déployer SANS vérification JWT : `supabase functions deploy rappels --no-verify-jwt`
// ════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail, layout, formatDateFr } from '../_shared/email.ts'

Deno.serve(async () => {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const maintenant = Date.now()
    const min25 = new Date(maintenant + 25 * 60000).toISOString()
    const min35 = new Date(maintenant + 35 * 60000).toISOString()

    // RDV confirmés, pas encore rappelés, dont le créneau tombe dans ~30 min
    const { data, error } = await admin
      .from('reservations')
      .select('id, rappel_envoye, clients(prenom, email), creneaux!inner(datetime_debut)')
      .eq('statut', 'confirmee')
      .eq('rappel_envoye', false)
      .gte('creneaux.datetime_debut', min25)
      .lte('creneaux.datetime_debut', min35)
    if (error) throw error

    let envoyes = 0
    for (const r of data || []) {
      const email = r.clients?.email
      const prenom = r.clients?.prenom || 'Client'
      const quand = formatDateFr(r.creneaux.datetime_debut)
      if (email) {
        await sendEmail(
          email,
          'Rappel : ta coupe dans 30 min — BARBER95',
          layout(
            'À tout de suite',
            `<p style="color:#e8e6e0;line-height:1.6;">Salut ${prenom}, petit rappel : ta coupe c'est
             <strong style="color:#b5a76a;text-transform:capitalize;">${quand}</strong>.</p>
             <p style="color:#6b6862;font-size:14px;">À tout de suite chez BARBER95 !</p>`
          )
        )
        envoyes++
      }
      await admin.from('reservations').update({ rappel_envoye: true }).eq('id', r.id)
    }

    return new Response(JSON.stringify({ ok: true, envoyes }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
