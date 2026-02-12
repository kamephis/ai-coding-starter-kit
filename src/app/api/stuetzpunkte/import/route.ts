import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const InsertRowSchema = z.object({
  action: z.literal('insert'),
  data: z.object({
    name: z.string().min(1),
    strasse: z.string().min(1),
    hausnummer: z.string().default(''),
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

const UpdateRowSchema = z.object({
  action: z.literal('update'),
  existingId: z.string().uuid(),
  data: z.object({
    name: z.string().min(1).optional(),
    strasse: z.string().min(1).optional(),
    hausnummer: z.string().min(1).optional(),
    plz: z.string().min(1).optional(),
    ort: z.string().min(1).optional(),
    land: z.string().optional(),
    telefon: z.string().min(1).optional(),
    notfallnummer: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    status: z.enum(['aktiv', 'temporaer_geschlossen']).optional(),
    oeffnungszeiten_typ: z.enum(['tagsueber', '24h']).optional(),
    oeffnungszeiten_von: z.string().optional().nullable(),
    oeffnungszeiten_bis: z.string().optional().nullable(),
  }),
})

const ImportSchema = z.object({
  rows: z.array(z.discriminatedUnion('action', [InsertRowSchema, UpdateRowSchema])).min(1).max(1000),
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
  const createdEntries: Array<{ id: string; strasse: string; hausnummer: string; plz: string; ort: string; land: string }> = []

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
      .select('id, strasse, hausnummer, plz, ort, land, latitude, longitude')

    if (insertError) {
      // If bulk insert fails, try one by one
      for (const row of inserts) {
        const rowData = {
          ...row.data,
          email: row.data.email?.trim() || null,
          notfallnummer: row.data.notfallnummer?.trim() || null,
          website: row.data.website?.trim() || null,
        }

        const { data: singleData, error: singleError } = await supabase
          .from('stuetzpunkte')
          .insert(rowData)
          .select('id, strasse, hausnummer, plz, ort, land, latitude, longitude')
          .single()

        if (singleError) {
          failed++
          errors.push({
            name: row.data.name,
            plz: row.data.plz,
            error: singleError.message,
          })
        } else {
          created++
          if (singleData && !singleData.latitude && !singleData.longitude) {
            createdEntries.push({
              id: singleData.id,
              strasse: singleData.strasse,
              hausnummer: singleData.hausnummer,
              plz: singleData.plz,
              ort: singleData.ort,
              land: singleData.land,
            })
          }
        }
      }
    } else {
      created = insertedData?.length ?? inserts.length
      // Collect entries that need geocoding (no coordinates)
      if (insertedData) {
        for (const entry of insertedData) {
          if (!entry.latitude && !entry.longitude) {
            createdEntries.push({
              id: entry.id,
              strasse: entry.strasse,
              hausnummer: entry.hausnummer,
              plz: entry.plz,
              ort: entry.ort,
              land: entry.land,
            })
          }
        }
      }
    }
  }

  // Update existing rows one by one (only mapped fields)
  for (const row of updates) {
    const updateData: Record<string, unknown> = {}

    // Only include fields that are present in the data object
    for (const [key, value] of Object.entries(row.data)) {
      if (value !== undefined) {
        if (key === 'email' || key === 'notfallnummer' || key === 'website') {
          updateData[key] = (value as string)?.trim() || null
        } else {
          updateData[key] = value
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      failed++
      errors.push({
        name: row.data.name ?? '?',
        plz: row.data.plz ?? '?',
        error: 'Keine Felder zum Aktualisieren',
      })
      continue
    }

    const { error: updateError } = await supabase
      .from('stuetzpunkte')
      .update(updateData)
      .eq('id', row.existingId)

    if (updateError) {
      failed++
      errors.push({
        name: row.data.name ?? '?',
        plz: row.data.plz ?? '?',
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
    createdEntries,
  })
}
