// Génération de liens d'ajout au calendrier (Google + Apple via .ics).

const TITRE = 'Coupe — BARBER95'

function fmtUTC(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function googleCalUrl(debut, fin) {
  const u = new URL('https://calendar.google.com/calendar/render')
  u.searchParams.set('action', 'TEMPLATE')
  u.searchParams.set('text', TITRE)
  u.searchParams.set('dates', `${fmtUTC(debut)}/${fmtUTC(fin)}`)
  u.searchParams.set('details', 'Rendez-vous chez BARBER95')
  return u.toString()
}

// Renvoie une URL data: téléchargeable (.ics) pour Apple Calendar / autres.
export function icsDataUri(debut, fin) {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BARBER95//FR',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@barber95`,
    `DTSTAMP:${fmtUTC(new Date())}`,
    `DTSTART:${fmtUTC(debut)}`,
    `DTEND:${fmtUTC(fin)}`,
    `SUMMARY:${TITRE}`,
    'DESCRIPTION:Rendez-vous chez BARBER95',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
}
