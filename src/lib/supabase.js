import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// `configured` = true seulement si les deux clés sont présentes.
// Tant que ce n'est pas le cas, l'app reste en mode démo (données mockées)
// et les fonctionnalités de compte affichent un état « configuration requise ».
export const configured = Boolean(url && anon)

export const supabase = configured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
