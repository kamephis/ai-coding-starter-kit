import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CheckDuplicatesSchema = z.object({
  pairs: z.array(
    z.object({
      name: z.string(),
      plz: z.string(),
    })
  ).min(1).max(1000),
})

// POST /api/stuetzpunkte/check-duplicates
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CheckDuplicatesSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { pairs } = parsed.data

  // Get unique PLZ values to reduce query scope
  const uniquePlzValues = [...new Set(pairs.map((p) => p.plz))]

  const { data: existing, error } = await supabase
    .from('stuetzpunkte')
    .select('id, name, plz, ort, strasse, hausnummer, telefon, status')
    .in('plz', uniquePlzValues)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build a lookup map: "name_lower::plz" -> existing record
  const duplicates: Record<string, {
    id: string
    name: string
    plz: string
    ort: string
    strasse: string
    hausnummer: string
  }> = {}

  for (const pair of pairs) {
    const key = `${pair.name.trim().toLowerCase()}::${pair.plz.trim()}`
    const match = existing?.find(
      (e) =>
        e.name.trim().toLowerCase() === pair.name.trim().toLowerCase() &&
        e.plz.trim() === pair.plz.trim()
    )
    if (match) {
      duplicates[key] = {
        id: match.id,
        name: match.name,
        plz: match.plz,
        ort: match.ort,
        strasse: match.strasse,
        hausnummer: match.hausnummer,
      }
    }
  }

  return NextResponse.json({ duplicates })
}
