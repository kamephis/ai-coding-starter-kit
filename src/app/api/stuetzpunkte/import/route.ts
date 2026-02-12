import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ImportRowSchema = z.object({
  action: z.enum(['insert', 'update']),
  existingId: z.string().uuid().optional(),
  data: z.object({
    name: z.string().min(1),
    strasse: z.string().min(1),
    hausnummer: z.string().min(1),
    plz: z.string().min(1),
    ort: z.string().min(1),
    land: z.string().default('CH'),
    telefon: z.string().min(1),
    notfallnummer: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    status: z.enum(['aktiv', 'temporaer_geschlossen']).default('aktiv'),
    oeffnungszeiten_typ: z.enum(['tagsueber', '24h']).default('tagsueber'),
    oeffnungszeiten_von: z.string().optional().nullable(),
    oeffnungszeiten_bis: z.string().optional().nullable(),
  }),
})

const ImportSchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(1000),
})

// POST /api/stuetzpunkte/import
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = ImportSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { rows } = parsed.data

  const inserts = rows.filter((r) => r.action === 'insert')
  const updates = rows.filter((r) => r.action === 'update')

  let created = 0
  let updated = 0
  let failed = 0
  const errors: Array<{ name: string; plz: string; error: string }> = []

  // Batch insert new rows
  if (inserts.length > 0) {
    const insertData = inserts.map((r) => ({
      ...r.data,
      email: r.data.email?.trim() || null,
      notfallnummer: r.data.notfallnummer?.trim() || null,
      website: r.data.website?.trim() || null,
    }))

    const { data: insertedData, error: insertError } = await supabase
      .from('stuetzpunkte')
      .insert(insertData)
      .select('id')

    if (insertError) {
      // If bulk insert fails, try one by one
      for (const row of inserts) {
        const { error: singleError } = await supabase
          .from('stuetzpunkte')
          .insert({
            ...row.data,
            email: row.data.email?.trim() || null,
            notfallnummer: row.data.notfallnummer?.trim() || null,
            website: row.data.website?.trim() || null,
          })

        if (singleError) {
          failed++
          errors.push({
            name: row.data.name,
            plz: row.data.plz,
            error: singleError.message,
          })
        } else {
          created++
        }
      }
    } else {
      created = insertedData?.length ?? inserts.length
    }
  }

  // Update existing rows one by one
  for (const row of updates) {
    if (!row.existingId) {
      failed++
      errors.push({
        name: row.data.name,
        plz: row.data.plz,
        error: 'Keine bestehende ID für Update',
      })
      continue
    }

    const { error: updateError } = await supabase
      .from('stuetzpunkte')
      .update({
        ...row.data,
        email: row.data.email?.trim() || null,
        notfallnummer: row.data.notfallnummer?.trim() || null,
        website: row.data.website?.trim() || null,
      })
      .eq('id', row.existingId)

    if (updateError) {
      failed++
      errors.push({
        name: row.data.name,
        plz: row.data.plz,
        error: updateError.message,
      })
    } else {
      updated++
    }
  }

  return NextResponse.json({
    created,
    updated,
    failed,
    errors,
    total: rows.length,
  })
}
