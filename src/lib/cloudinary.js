// Upload Cloudinary non signé (depuis le dashboard Adam).
// Nécessite un "upload preset" non signé créé dans Cloudinary.

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const cloudinaryConfigured = Boolean(CLOUD && PRESET)

// Upload un fichier (image ou vidéo). Renvoie { url, public_id, type }.
export async function uploadCloudinary(file) {
  if (!cloudinaryConfigured) throw new Error('Cloudinary non configuré')
  const estVideo = file.type.startsWith('video/')
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/${estVideo ? 'video' : 'image'}/upload`

  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', PRESET)

  const res = await fetch(endpoint, { method: 'POST', body: fd })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Cloudinary ${res.status}: ${t}`)
  }
  const data = await res.json()
  return {
    url: data.secure_url,
    public_id: data.public_id,
    type: estVideo ? 'video' : 'image',
  }
}
