// ════════════════════════════════════════════════════════════
// Edge Function `relance` — à planifier 1 fois par semaine (cron).
// Relance par email les clients dont la dernière résa date de plus de
// N semaines (N lu dans site_contenu `relance.semaines`, défaut 3 —
// configurable par Adam depuis son dashboard).
//
// Anti-spam : une seule relance par période d'inactivité
// (clients.relance_envoyee_at doit être antérieur à la dernière résa).
// Un client avec un RDV à venir n'est jamais relancé (sa « dernière
// résa » est dans le futur).
//
// Déployer SANS vérification JWT : `supabase functions deploy relance --no-verify-jwt`
// ════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail, layout, bouton } from '../_shared/email.ts'

Deno.serve(async () => {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const site = Deno.env.get('SITE_URL') || ''

    // délai configuré par Adam (en semaines)
    const { data: cfg } = await admin
      .from('site_contenu')
      .select('valeur')
      .eq('cle', 'relance.semaines')
      .maybeSingle()
    const semaines = Math.max(1, parseInt(cfg?.valeur ?? '3', 10) || 3)
    const cutoff = Date.now() - semaines * 7 * 24 * 3600 * 1000

    // dernière résa (non annulée) de chaque client
    const { data: resas, error } = await admin
      .from('reservations')
      .select('client_id, statut, creneaux!inner(datetime_debut)')
      .neq('statut', 'annulee')
    if (error) throw error

    const derniere = new Map<string, number>()
    for (const r of resas || []) {
      const t = new Date((r as any).creneaux.datetime_debut).getTime()
      const prev = derniere.get(r.client_id)
      if (prev === undefined || t > prev) derniere.set(r.client_id, t)
    }

    const inactifs = [...derniere.entries()]
      .filter(([, t]) => t < cutoff)
      .map(([id]) => id)
    if (inactifs.length === 0) {
      return new Response(JSON.stringify({ ok: true, envoyes: 0, semaines }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: clients, error: errClients } = await admin
      .from('clients')
      .select('id, prenom, email, role, relance_envoyee_at')
      .in('id', inactifs)
    if (errClients) throw errClients

    let envoyes = 0
    for (const c of clients || []) {
      if (c.role === 'admin' || !c.email) continue
      // déjà relancé depuis sa dernière venue ? on attend qu'il revienne.
      const derniereResa = derniere.get(c.id)!
      if (c.relance_envoyee_at && new Date(c.relance_envoyee_at).getTime() >= derniereResa) continue

      const prenom = c.prenom || 'Champion'
      await sendEmail(
        c.email,
        'Ça repousse là, non ? — BARBER95',
        layout(
          'On remet ça ?',
          `<p style="color:#e8e6e0;line-height:1.6;">Salut ${prenom}, ça fait un moment
           qu'on ne t'a pas vu chez BARBER95. Ta coupe mérite un rafraîchissement ✂️</p>
           <p>${bouton(site + '/book?source=relance', 'Reprendre un RDV')}</p>`
        )
      )
      await admin
        .from('clients')
        .update({ relance_envoyee_at: new Date().toISOString() })
        .eq('id', c.id)
      envoyes++
    }

    return new Response(JSON.stringify({ ok: true, envoyes, semaines }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
