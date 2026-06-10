// ════════════════════════════════════════════════════════════
// VERSION AUTONOME (tout-en-un) de l'Edge Function `relance`,
// pour un déploiement par COPIER-COLLER dans l'éditeur web Supabase.
//
// → Dashboard → Edge Functions → Deploy a new function → nom : relance
//   → colle TOUT ce fichier → Deploy.
//   (« Verify JWT » peut rester activé : le cron envoie la clé anon.)
//
// Le code canonique (multi-fichiers, pour le CLI) reste dans
// supabase/functions/relance/. Garde les deux en phase si tu modifies l'un.
// ════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM = Deno.env.get('EMAIL_FROM') ?? 'BARBER95 <onboarding@resend.dev>'

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

Deno.serve(async () => {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const site = Deno.env.get('SITE_URL') || ''

    const { data: cfg } = await admin
      .from('site_contenu')
      .select('valeur')
      .eq('cle', 'relance.semaines')
      .maybeSingle()
    const semaines = Math.max(1, parseInt(cfg?.valeur ?? '3', 10) || 3)
    const cutoff = Date.now() - semaines * 7 * 24 * 3600 * 1000

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

    const inactifs = [...derniere.entries()].filter(([, t]) => t < cutoff).map(([id]) => id)
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
