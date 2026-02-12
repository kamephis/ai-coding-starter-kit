'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  FileSpreadsheet,
  Loader2,
  ListChecks,
} from 'lucide-react'

// --- Types ---

interface FieldMapping {
  csvColumn: string
  targetField: string
}

interface ImportRow {
  rowNum: number
  rawData: Record<string, string>
  mappedData: Record<string, string>
  status: 'valid' | 'duplicate' | 'invalid'
  errors: string[]
  warnings: string[]
  duplicateExisting?: {
    id: string
    name: string
    plz: string
    ort: string
    strasse: string
    hausnummer: string
  }
  duplicateAction: 'overwrite' | 'skip'
}

interface ImportResult {
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ name: string; plz: string; error: string }>
}

// --- Constants ---

const TARGET_FIELDS = [
  { value: '_ignore', label: 'Nicht importieren' },
  { value: 'name', label: 'Name', required: true },
  { value: 'strasse', label: 'Straße', required: true },
  { value: 'hausnummer', label: 'Hausnummer' },
  { value: 'plz', label: 'PLZ', required: true },
  { value: 'ort', label: 'Ort', required: true },
  { value: 'telefon', label: 'Telefon', required: true },
  { value: 'land', label: 'Land' },
  { value: 'email', label: 'E-Mail' },
  { value: 'website', label: 'Website' },
  { value: 'notfallnummer', label: 'Notfallnummer' },
  { value: 'latitude', label: 'Breitengrad (Latitude)' },
  { value: 'longitude', label: 'Längengrad (Longitude)' },
  { value: 'oeffnungszeiten_typ', label: 'Öffnungszeiten-Typ' },
  { value: 'oeffnungszeiten_von', label: 'Öffnungszeiten von' },
  { value: 'oeffnungszeiten_bis', label: 'Öffnungszeiten bis' },
  { value: 'status', label: 'Status' },
] as const

const REQUIRED_FIELDS = TARGET_FIELDS.filter((f) => 'required' in f && f.required).map((f) => f.value)

// Split "Bahnhofstrasse 42" → { strasse: "Bahnhofstrasse", hausnummer: "42" }
function splitStrasseHausnummer(value: string): { strasse: string; hausnummer: string } {
  const trimmed = value.trim()
  // Match last segment that starts with a digit (e.g., "42", "5a", "10-12")
  const match = trimmed.match(/^(.+?)\s+(\d\S*)$/)
  if (match) {
    return { strasse: match[1].trim(), hausnummer: match[2].trim() }
  }
  // No house number found - return whole value as strasse
  return { strasse: trimmed, hausnummer: '' }
}

const MAX_ROWS = 1000
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

// --- Auto-split combined address columns ---

function normalizeAddressColumns(
  headers: string[],
  rows: Record<string, string>[]
): { headers: string[]; rows: Record<string, string>[]; splitInfo: string | null } {
  // Check if a hausnummer column already exists
  const hasHausnummer = headers.some((h) => {
    const n = h.trim().toLowerCase().replace(/[^a-zäöü0-9]/g, '')
    return /^(hausnummer|hausnr|hnr|nr|number)$/.test(n)
  })

  if (hasHausnummer) {
    return { headers, rows, splitInfo: null }
  }

  // Find a column that looks like a combined address
  const addressPattern = /^(strasse|str|straße|adresse|address|street|strassehausnummer|straßehausnummer|strassenr|straßenr|adressekomplett|fulladdress)$/
  const addressColIndex = headers.findIndex((h) => {
    const n = h.trim().toLowerCase().replace(/[^a-zäöü0-9]/g, '')
    return addressPattern.test(n)
  })

  if (addressColIndex === -1) {
    return { headers, rows, splitInfo: null }
  }

  const addressColName = headers[addressColIndex]

  // Check if values look like combined addresses (street + number)
  const sampleValues = rows.slice(0, 10).map((r) => r[addressColName] ?? '')
  const matchCount = sampleValues.filter((v) => /^.+\s+\d\S*$/.test(v.trim())).length

  if (matchCount < Math.min(2, sampleValues.length)) {
    return { headers, rows, splitInfo: null }
  }

  // Replace the combined column with two separate columns
  const newHeaders = [...headers]
  newHeaders.splice(addressColIndex, 1, 'Straße', 'Hausnummer')

  const newRows = rows.map((row) => {
    const newRow: Record<string, string> = {}
    for (const key of headers) {
      if (key === addressColName) continue
      newRow[key] = row[key] ?? ''
    }
    const combined = row[addressColName] ?? ''
    const { strasse, hausnummer } = splitStrasseHausnummer(combined)
    newRow['Straße'] = strasse
    newRow['Hausnummer'] = hausnummer
    return newRow
  })

  return {
    headers: newHeaders,
    rows: newRows,
    splitInfo: `Spalte «${addressColName}» wurde automatisch in Straße und Hausnummer aufgetrennt.`,
  }
}

// --- Auto-mapping heuristics ---

function guessTargetField(csvHeader: string, alreadyMapped: Set<string>): string {
  const h = csvHeader.trim().toLowerCase().replace(/[^a-zäöü0-9]/g, '')

  const heuristics: Array<[RegExp, string]> = [
    [/^(name|firmenname|firma|bezeichnung|standort)$/, 'name'],
    [/^(strasse|str|straße|adresse|address|street)$/, 'strasse'],
    [/^(hausnummer|hausnr|hnr|nr|number)$/, 'hausnummer'],
    [/^(plz|postleitzahl|zip|zipcode|postal)$/, 'plz'],
    [/^(ort|stadt|city|gemeinde|ortschaft|town)$/, 'ort'],
    [/^(telefon|tel|phone|fon|telefonnummer)$/, 'telefon'],
    [/^(land|country|staat)$/, 'land'],
    [/^(email|mail|emailadresse|emailaddress)$/, 'email'],
    [/^(website|web|url|homepage|webseite)$/, 'website'],
    [/^(notfallnummer|notfall|emergency|pikett)$/, 'notfallnummer'],
    [/^(latitude|lat|breitengrad)$/, 'latitude'],
    [/^(longitude|lng|lon|längengrad|laengengrad)$/, 'longitude'],
    [/^(status)$/, 'status'],
    [/^(öffnungszeitentyp|oeffnungszeitentyp|typ)$/, 'oeffnungszeiten_typ'],
    [/^(öffnungszeitenvon|oeffnungszeitenvon|von|openfrom)$/, 'oeffnungszeiten_von'],
    [/^(öffnungszeitenbis|oeffnungszeitenbis|bis|opento)$/, 'oeffnungszeiten_bis'],
  ]

  for (const [regex, field] of heuristics) {
    if (regex.test(h) && !alreadyMapped.has(field)) {
      return field
    }
  }
  return '_ignore'
}

// --- Validation ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateRow(mappedData: Record<string, string>): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  for (const field of REQUIRED_FIELDS) {
    if (!mappedData[field]?.trim()) {
      const label = TARGET_FIELDS.find((f) => f.value === field)?.label ?? field
      errors.push(`${label} fehlt`)
    }
  }

  // Hausnummer is a soft warning - entries can be imported and fixed later
  if (!mappedData.hausnummer?.trim()) {
    warnings.push('Hausnummer fehlt – bitte nach Import ergänzen')
  }

  if (mappedData.status && mappedData.status.trim() !== '') {
    const s = mappedData.status.trim().toLowerCase()
    if (s !== 'aktiv' && s !== 'temporaer_geschlossen') {
      errors.push('Ungültiger Status-Wert (erlaubt: aktiv, temporaer_geschlossen)')
    }
  }

  if (mappedData.oeffnungszeiten_typ && mappedData.oeffnungszeiten_typ.trim() !== '') {
    const t = mappedData.oeffnungszeiten_typ.trim().toLowerCase()
    if (t !== 'tagsueber' && t !== '24h') {
      errors.push('Ungültiger Öffnungszeiten-Typ (erlaubt: tagsueber, 24h)')
    }
  }

  if (mappedData.email && mappedData.email.trim() !== '') {
    if (!EMAIL_REGEX.test(mappedData.email.trim())) {
      errors.push('Ungültiges E-Mail-Format')
    }
  }

  if (mappedData.latitude && mappedData.latitude.trim() !== '') {
    if (isNaN(Number(mappedData.latitude))) {
      errors.push('Breitengrad muss numerisch sein')
    }
  }

  if (mappedData.longitude && mappedData.longitude.trim() !== '') {
    if (isNaN(Number(mappedData.longitude))) {
      errors.push('Längengrad muss numerisch sein')
    }
  }

  return { errors, warnings }
}

// --- Deduplicate CSV headers ---

function deduplicateHeaders(headers: string[]): string[] {
  const counts: Record<string, number> = {}
  return headers.map((h) => {
    const trimmed = h.trim() || 'Spalte'
    counts[trimmed] = (counts[trimmed] || 0) + 1
    if (counts[trimmed] > 1) {
      return `${trimmed} (${counts[trimmed]})`
    }
    return trimmed
  })
}

// --- Main Component ---

export default function CsvImportPage() {
  const [step, setStep] = useState(1)

  // Step 1: File Upload
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [splitInfo, setSplitInfo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Step 2: Field Mapping
  const [mappings, setMappings] = useState<FieldMapping[]>([])

  // Step 3: Preview
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [isValidating, setIsValidating] = useState(false)

  // Step 4: Import
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Warn on page leave during import
  useEffect(() => {
    if (!isImporting) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isImporting])

  // --- Step 1: File Parsing ---

  const parseFile = (file: File) => {
    setFileError(null)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Bitte eine .csv-Datei auswählen.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Die Datei ist zu groß (max. 5 MB).')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete(results) {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setFileError('Keine Spaltenköpfe in der Datei gefunden.')
          return
        }

        if (results.data.length === 0) {
          setFileError('Keine Daten zum Importieren gefunden (nur Header-Zeile).')
          return
        }

        if (results.data.length > MAX_ROWS) {
          setFileError(`Zu viele Zeilen (${results.data.length}). Maximal ${MAX_ROWS} Zeilen erlaubt.`)
          return
        }

        const rawHeaders = deduplicateHeaders(results.meta.fields)
        const rows = results.data as Record<string, string>[]

        // Re-map rows to deduplicated headers
        const remappedRows = rows.map((row) => {
          const newRow: Record<string, string> = {}
          results.meta.fields!.forEach((originalHeader, i) => {
            newRow[rawHeaders[i]] = (row[originalHeader] ?? '').trim()
          })
          return newRow
        })

        // Filter out completely empty rows
        const nonEmptyRows = remappedRows.filter((row) =>
          Object.values(row).some((v) => v !== '')
        )

        if (nonEmptyRows.length === 0) {
          setFileError('Keine Daten zum Importieren gefunden (alle Zeilen sind leer).')
          return
        }

        // Auto-split combined address columns (e.g. "Musterweg 2" → Straße + Hausnummer)
        const { headers, rows: normalizedRows, splitInfo: info } = normalizeAddressColumns(rawHeaders, nonEmptyRows)

        setCsvHeaders(headers)
        setCsvRows(normalizedRows)
        setSplitInfo(info)
        setFileName(file.name)

        // Auto-map columns
        const alreadyMapped = new Set<string>()
        const autoMappings: FieldMapping[] = headers.map((h) => {
          const guess = guessTargetField(h, alreadyMapped)
          if (guess !== '_ignore') {
            alreadyMapped.add(guess)
          }
          return { csvColumn: h, targetField: guess }
        })
        setMappings(autoMappings)
        setStep(2)
      },
      error(err) {
        setFileError(`CSV-Parsing fehlgeschlagen: ${err.message}`)
      },
    })
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  // --- Step 2: Mapping ---

  const updateMapping = (csvColumn: string, targetField: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn ? { ...m, targetField } : m
      )
    )
  }

  const assignedTargets = new Set(
    mappings.filter((m) => m.targetField !== '_ignore').map((m) => m.targetField)
  )

  const missingRequired = REQUIRED_FIELDS.filter((f) => !assignedTargets.has(f))
  const allRequiredMapped = missingRequired.length === 0

  const getPreviewValues = (csvColumn: string): string[] => {
    return csvRows
      .slice(0, 3)
      .map((row) => row[csvColumn] ?? '')
      .filter((v) => v !== '')
  }

  // --- Step 3: Validation + Duplicate Check ---

  const runValidation = useCallback(async () => {
    setIsValidating(true)

    // Map CSV data to target fields
    const rows: ImportRow[] = csvRows.map((rawRow, i) => {
      const mappedData: Record<string, string> = {}
      for (const mapping of mappings) {
        if (mapping.targetField === '_ignore') continue
        mappedData[mapping.targetField] = rawRow[mapping.csvColumn] ?? ''
      }

      const { errors, warnings } = validateRow(mappedData)

      return {
        rowNum: i + 1,
        rawData: rawRow,
        mappedData,
        status: errors.length > 0 ? 'invalid' : 'valid',
        errors,
        warnings,
        duplicateAction: 'skip' as const,
      }
    })

    // Check duplicates for valid rows
    const validRows = rows.filter((r) => r.status === 'valid')
    if (validRows.length > 0) {
      try {
        const pairs = validRows.map((r) => ({
          name: r.mappedData.name?.trim() ?? '',
          plz: r.mappedData.plz?.trim() ?? '',
        }))

        const response = await fetch('/api/stuetzpunkte/check-duplicates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairs }),
        })

        if (response.ok) {
          const { duplicates } = await response.json()

          for (const row of rows) {
            if (row.status !== 'valid') continue
            const key = `${row.mappedData.name?.trim().toLowerCase()}::${row.mappedData.plz?.trim()}`
            if (duplicates[key]) {
              row.status = 'duplicate'
              row.duplicateExisting = duplicates[key]
            }
          }
        }
      } catch {
        // Duplicate check failed, continue without
      }
    }

    setImportRows(rows)
    setIsValidating(false)
  }, [csvRows, mappings])

  const goToPreview = () => {
    setStep(3)
    runValidation()
  }

  const validCount = importRows.filter((r) => r.status === 'valid').length
  const warningCount = importRows.filter((r) => r.status !== 'invalid' && r.warnings.length > 0).length
  const duplicateCount = importRows.filter((r) => r.status === 'duplicate').length
  const invalidCount = importRows.filter((r) => r.status === 'invalid').length

  const importableCount =
    validCount +
    importRows.filter((r) => r.status === 'duplicate' && r.duplicateAction === 'overwrite').length

  const setAllDuplicateAction = (action: 'overwrite' | 'skip') => {
    setImportRows((prev) =>
      prev.map((r) =>
        r.status === 'duplicate' ? { ...r, duplicateAction: action } : r
      )
    )
  }

  const setRowDuplicateAction = (rowNum: number, action: 'overwrite' | 'skip') => {
    setImportRows((prev) =>
      prev.map((r) =>
        r.rowNum === rowNum ? { ...r, duplicateAction: action } : r
      )
    )
  }

  // --- Step 4: Import Execution ---

  const executeImport = async () => {
    setIsImporting(true)
    setImportProgress(10)
    setImportError(null)

    // Collect rows to import
    const rowsToImport = importRows.filter(
      (r) =>
        r.status === 'valid' ||
        (r.status === 'duplicate' && r.duplicateAction === 'overwrite')
    )

    const skippedCount = importRows.filter(
      (r) => r.status === 'duplicate' && r.duplicateAction === 'skip'
    ).length

    // BUG-1 fix: Track which fields were actually mapped by the user
    const mappedFieldNames = new Set(
      mappings
        .filter((m) => m.targetField !== '_ignore')
        .map((m) => m.targetField)
    )

    const apiRows = rowsToImport.map((r) => {
      const isUpdate = r.status === 'duplicate'

      if (isUpdate) {
        // For updates, only send fields that were actually mapped
        const data: Record<string, unknown> = {}
        for (const field of mappedFieldNames) {
          const value = r.mappedData[field]
          if (value === undefined) continue
          if (field === 'latitude' || field === 'longitude') {
            if (value.trim()) data[field] = parseFloat(value)
          } else if (field === 'email' || field === 'notfallnummer' || field === 'website') {
            data[field] = value.trim() || null
          } else if (field === 'status') {
            if (value.trim()) data[field] = value.trim().toLowerCase()
          } else if (field === 'oeffnungszeiten_typ') {
            if (value.trim()) data[field] = value.trim().toLowerCase()
          } else {
            data[field] = value.trim()
          }
        }
        return {
          action: 'update' as const,
          existingId: r.duplicateExisting?.id ?? '',
          data,
        }
      }

      // For inserts, send all fields with defaults
      const data: Record<string, unknown> = {
        name: r.mappedData.name?.trim() ?? '',
        strasse: r.mappedData.strasse?.trim() ?? '',
        hausnummer: r.mappedData.hausnummer?.trim() ?? '',
        plz: r.mappedData.plz?.trim() ?? '',
        ort: r.mappedData.ort?.trim() ?? '',
        land: r.mappedData.land?.trim() || 'CH',
        telefon: r.mappedData.telefon?.trim() ?? '',
        notfallnummer: r.mappedData.notfallnummer?.trim() || null,
        email: r.mappedData.email?.trim() || null,
        website: r.mappedData.website?.trim() || null,
        status: r.mappedData.status?.trim().toLowerCase() || 'aktiv',
        oeffnungszeiten_typ: r.mappedData.oeffnungszeiten_typ?.trim().toLowerCase() || 'tagsueber',
        oeffnungszeiten_von: r.mappedData.oeffnungszeiten_von?.trim() || null,
        oeffnungszeiten_bis: r.mappedData.oeffnungszeiten_bis?.trim() || null,
      }
      if (r.mappedData.latitude?.trim()) {
        data.latitude = parseFloat(r.mappedData.latitude)
      }
      if (r.mappedData.longitude?.trim()) {
        data.longitude = parseFloat(r.mappedData.longitude)
      }
      return {
        action: 'insert' as const,
        existingId: undefined,
        data,
      }
    })

    setImportProgress(30)

    try {
      const response = await fetch('/api/stuetzpunkte/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: apiRows }),
      })

      setImportProgress(70)

      if (!response.ok) {
        const errorData = await response.json()
        setImportError(errorData.error || 'Import fehlgeschlagen')
        setIsImporting(false)
        return
      }

      const result = await response.json()

      setImportProgress(90)

      // BUG-3 fix: Geocode newly created entries that lack coordinates
      // The API returns createdEntries with IDs and address data
      if (result.createdEntries && result.createdEntries.length > 0) {
        geocodeAndSaveCoordinates(result.createdEntries)
      }

      setImportResult({
        created: result.created,
        updated: result.updated,
        skipped: skippedCount,
        failed: result.failed,
        errors: result.errors,
      })

      setImportProgress(100)
      setStep(4)
    } catch {
      setImportError('Netzwerkfehler beim Import. Bitte erneut versuchen.')
    }

    setIsImporting(false)
  }

  // BUG-3 fix: Geocode entries and save coordinates to DB via PUT
  const geocodeAndSaveCoordinates = async (
    entries: Array<{ id: string; strasse: string; hausnummer: string; plz: string; ort: string; land: string }>
  ) => {
    for (const entry of entries) {
      const address = `${entry.strasse} ${entry.hausnummer} ${entry.plz} ${entry.ort} ${entry.land}`
      try {
        const geoResponse = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
        if (geoResponse.ok) {
          const { latitude, longitude } = await geoResponse.json()
          if (latitude && longitude) {
            await fetch(`/api/stuetzpunkte/${entry.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude }),
            })
          }
        }
      } catch {
        // Geocoding errors are non-critical
      }
      // Rate limit: 1 request per second
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/stuetzpunkte">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CSV-Import</h2>
          <p className="text-muted-foreground">
            Stützpunkte per CSV-Datei importieren
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Mapping' },
          { num: 3, label: 'Vorschau' },
          { num: 4, label: 'Ergebnis' },
        ].map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                step === num
                  ? 'bg-primary text-primary-foreground'
                  : step > num
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="font-medium">{num}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: File Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV-Datei hochladen
            </CardTitle>
            <CardDescription>
              Laden Sie eine CSV-Datei mit Stützpunkt-Daten hoch. Unterstützt werden Komma, Semikolon und Tab als Trennzeichen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fileError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
            >
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">
                CSV-Datei hierher ziehen
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                oder Datei auswählen (max. 5 MB, max. 1.000 Zeilen)
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Datei auswählen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Field Mapping */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Feldmapping
            </CardTitle>
            <CardDescription>
              Ordnen Sie jede CSV-Spalte dem passenden Datenbankfeld zu. Datei: {fileName} ({csvRows.length} Zeilen)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info about auto-split address column */}
            {splitInfo && (
              <Alert>
                <AlertDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  {splitInfo}
                </AlertDescription>
              </Alert>
            )}

            {/* Required fields status */}
            <div className="rounded-md bg-muted p-3 text-sm">
              {allRequiredMapped ? (
                <span className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Alle Pflichtfelder zugeordnet
                </span>
              ) : (
                <span className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Fehlende Pflichtfelder: {missingRequired.map((f) => TARGET_FIELDS.find((t) => t.value === f)?.label).join(', ')}
                </span>
              )}
            </div>

            {/* Mapping table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">CSV-Spalte</TableHead>
                  <TableHead className="w-[200px]">Vorschau</TableHead>
                  <TableHead>Zielfeld</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => {
                  const preview = getPreviewValues(mapping.csvColumn)
                  return (
                    <TableRow key={mapping.csvColumn}>
                      <TableCell className="font-medium">
                        {mapping.csvColumn}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {preview.length > 0 ? (
                            preview.map((v, i) => (
                              <Badge key={i} variant="secondary" className="max-w-[150px] truncate text-xs font-normal">
                                {v}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">leer</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(val) => updateMapping(mapping.csvColumn, val)}
                        >
                          <SelectTrigger className="w-[240px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_FIELDS.map((field) => {
                              const isAssigned =
                                field.value !== '_ignore' &&
                                assignedTargets.has(field.value) &&
                                mapping.targetField !== field.value
                              return (
                                <SelectItem
                                  key={field.value}
                                  value={field.value}
                                  disabled={isAssigned}
                                >
                                  {field.label}
                                  {'required' in field && field.required && ' *'}
                                  {isAssigned && ' (bereits zugeordnet)'}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button onClick={goToPreview} disabled={!allRequiredMapped}>
                Weiter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Validation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Vorschau & Validierung
            </CardTitle>
            <CardDescription>
              Überprüfen Sie die Daten vor dem Import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isValidating ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Daten werden validiert...
              </div>
            ) : (
              <>
                {/* Summary bar */}
                <div className="flex flex-wrap gap-3 rounded-md bg-muted p-3">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {validCount} gültig
                  </Badge>
                  {warningCount > 0 && (
                    <Badge variant="default" className="bg-orange-500">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {warningCount} unvollständig
                    </Badge>
                  )}
                  <Badge variant="default" className="bg-amber-500">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {duplicateCount} Duplikat{duplicateCount !== 1 ? 'e' : ''}
                  </Badge>
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    {invalidCount} ungültig
                  </Badge>
                </div>

                {/* Bulk duplicate actions */}
                {duplicateCount > 0 && (
                  <div className="flex items-center gap-2 rounded-md border p-3">
                    <span className="text-sm font-medium">Alle Duplikate:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllDuplicateAction('overwrite')}
                    >
                      Alle überschreiben
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllDuplicateAction('skip')}
                    >
                      Alle überspringen
                    </Button>
                  </div>
                )}

                {/* Import error */}
                {importError && (
                  <Alert variant="destructive">
                    <AlertDescription>{importError}</AlertDescription>
                  </Alert>
                )}

                {/* Progress bar during import */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Import läuft...
                    </div>
                    <Progress value={importProgress} />
                  </div>
                )}

                {/* Preview table */}
                <ScrollArea className="h-[500px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead className="w-[60px]">Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>PLZ</TableHead>
                        <TableHead>Ort</TableHead>
                        <TableHead>Straße</TableHead>
                        <TableHead>Details / Fehler</TableHead>
                        <TableHead className="w-[160px]">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((row) => (
                        <TableRow
                          key={row.rowNum}
                          className={
                            row.status === 'invalid'
                              ? 'bg-red-50'
                              : row.status === 'duplicate'
                                ? 'bg-amber-50'
                                : ''
                          }
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {row.rowNum}
                          </TableCell>
                          <TableCell>
                            {row.status === 'valid' && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {row.status === 'duplicate' && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                            {row.status === 'invalid' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.mappedData.name}
                          </TableCell>
                          <TableCell>{row.mappedData.plz}</TableCell>
                          <TableCell>{row.mappedData.ort}</TableCell>
                          <TableCell>
                            {row.mappedData.strasse} {row.mappedData.hausnummer}
                          </TableCell>
                          <TableCell>
                            {row.status === 'invalid' && (
                              <span className="text-xs text-red-600">
                                {row.errors.join('; ')}
                              </span>
                            )}
                            {row.status === 'duplicate' && row.duplicateExisting && (
                              <span className="text-xs text-amber-700">
                                Duplikat: {row.duplicateExisting.name}, {row.duplicateExisting.ort}
                              </span>
                            )}
                            {row.status !== 'invalid' && row.warnings.length > 0 && (
                              <span className="text-xs text-orange-600">
                                {row.warnings.join('; ')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.status === 'duplicate' && (
                              <Select
                                value={row.duplicateAction}
                                onValueChange={(val: 'overwrite' | 'skip') =>
                                  setRowDuplicateAction(row.rowNum, val)
                                }
                              >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">Überspringen</SelectItem>
                                  <SelectItem value="overwrite">Überschreiben</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} disabled={isImporting}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück
                  </Button>
                  <Button
                    onClick={executeImport}
                    disabled={importableCount === 0 || isImporting}
                  >
                    {isImporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {importableCount} Stützpunkt{importableCount !== 1 ? 'e' : ''} importieren
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import Result */}
      {step === 4 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import abgeschlossen
            </CardTitle>
            <CardDescription>
              Der CSV-Import wurde erfolgreich durchgeführt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                <p className="text-sm text-muted-foreground">Neu angelegt</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                <p className="text-sm text-muted-foreground">Aktualisiert</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                <p className="text-sm text-muted-foreground">Übersprungen</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                <p className="text-sm text-muted-foreground">Fehlgeschlagen</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="mb-2 font-medium">Fehlerdetails:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>
                        {err.name} (PLZ {err.plz}): {err.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button asChild>
                <Link href="/admin/stuetzpunkte">
                  Zur Stützpunkte-Liste
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Reset all state for a new import
                  setStep(1)
                  setCsvHeaders([])
                  setCsvRows([])
                  setFileName('')
                  setFileError(null)
                  setMappings([])
                  setSplitInfo(null)
                  setImportRows([])
                  setImportResult(null)
                  setImportError(null)
                  setImportProgress(0)
                }}
              >
                Neuen Import starten
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
