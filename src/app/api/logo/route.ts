import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const MAX_SIZE = 1 * 1024 * 1024 // 1 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const BUCKET = 'stuetzpunkt-bilder'
const LOGO_PREFIX = 'branding/'

// POST /api/logo - Logo hochladen (ersetzt vorhandenes)
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Ungültiges Format. Erlaubt: JPG, PNG, WebP, SVG' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Datei zu groß. Maximum: 1 MB' },
      { status: 400 }
    )
  }

  // 1. Upload new logo first (before deleting old one)
  const ext = file.name.split('.').pop() || 'png'
  const fileName = `logo-${Date.now()}.${ext}`
  const filePath = `${LOGO_PREFIX}${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath)

  const newLogoUrl = urlData.publicUrl

  // 2. Update widget_config with new logo_url
  const { error: updateError } = await supabase
    .from('widget_config')
    .update({ logo_url: newLogoUrl })
    .eq('id', 1)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 3. Clean up all old logos in branding/ (handles race conditions too)
  const { data: files } = await supabase.storage.from(BUCKET).list(LOGO_PREFIX)
  if (files) {
    const toDelete = files
      .filter((f) => f.name !== fileName)
      .map((f) => `${LOGO_PREFIX}${f.name}`)
    if (toDelete.length > 0) {
      await supabase.storage.from(BUCKET).remove(toDelete)
    }
  }

  return NextResponse.json({ logo_url: newLogoUrl }, { status: 201 })
}

// DELETE /api/logo - Logo entfernen
export async function DELETE() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  // Get current logo_url
  const { data: configData } = await supabase
    .from('widget_config')
    .select('logo_url')
    .single()

  if (!configData?.logo_url) {
    return NextResponse.json({ error: 'Kein Logo vorhanden' }, { status: 404 })
  }

  // Remove from storage
  const storagePath = extractStoragePath(configData.logo_url)
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath])
  }

  // Clear logo_url in config
  const { error: updateError } = await supabase
    .from('widget_config')
    .update({ logo_url: null })
    .eq('id', 1)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/** Extract the storage path from a full public URL */
function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length)
}
