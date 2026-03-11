import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from '../i18n'
import type { Stuetzpunkt } from '../types'
import { haversineDistance } from '../utils/haversine'

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 3) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong className="hsf-autocomplete-highlight">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}

function formatAddress(sp: Stuetzpunkt): string {
  const street = [sp.strasse, sp.hausnummer].filter(Boolean).join(' ')
  const city = [sp.plz, sp.ort].filter(Boolean).join(' ')
  return [street, city].filter(Boolean).join(', ')
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  primaryColor: string
  stuetzpunkte: Stuetzpunkt[]
  activeServiceFilters: string[]
  userLocation: { lat: number; lng: number } | null
  onSelectStuetzpunkt: (id: string) => void
}

export function SearchBar({
  value,
  onChange,
  primaryColor,
  stuetzpunkte,
  activeServiceFilters,
  userLocation,
  onSelectStuetzpunkt,
}: SearchBarProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listboxId = 'hsf-autocomplete-listbox'

  useEffect(() => {
    setInput(value)
  }, [value])

  const handleChange = (val: string) => {
    setInput(val)
    setHighlightedIndex(-1)
    setShowDropdown(val.length >= 3)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(val), 300)
  }

  // Compute suggestions from un-debounced input (no debounce for autocomplete)
  const suggestions = useMemo(() => {
    if (input.length < 3) return []

    const q = input.toLowerCase()

    // Apply service filters first
    let base = stuetzpunkte
    if (activeServiceFilters.length > 0) {
      base = base.filter((sp) => {
        const spServiceIds = sp.stuetzpunkt_services?.map((ss) => ss.service_typ_id) || []
        return activeServiceFilters.every((fid) => spServiceIds.includes(fid))
      })
    }

    // Filter by search text across 5 fields
    let matches = base.filter((sp) =>
      sp.name.toLowerCase().includes(q) ||
      sp.plz.toLowerCase().includes(q) ||
      sp.ort.toLowerCase().includes(q) ||
      (sp.strasse && sp.strasse.toLowerCase().includes(q)) ||
      (sp.hausnummer && sp.hausnummer.toLowerCase().includes(q))
    )

    // Sort by distance if userLocation available
    if (userLocation) {
      matches = matches.slice().sort((a, b) =>
        haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
        haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
      )
    }

    return matches.slice(0, 5)
  }, [input, stuetzpunkte, activeServiceFilters, userLocation])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((sp: Stuetzpunkt) => {
    setInput(sp.name)
    setShowDropdown(false)
    setHighlightedIndex(-1)
    // Clear pending debounce and update parent immediately
    clearTimeout(timerRef.current)
    onChange(sp.name)
    onSelectStuetzpunkt(sp.id)
  }, [onChange, onSelectStuetzpunkt])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault()
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const handleFocus = () => {
    if (input.length >= 3 && suggestions.length > 0) {
      setShowDropdown(true)
    }
  }

  const dropdownVisible = showDropdown && suggestions.length > 0

  return (
    <div className="hsf-search" ref={containerRef}>
      <svg className="hsf-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        className="hsf-search-input"
        placeholder={t('search.placeholder')}
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        role="combobox"
        aria-expanded={dropdownVisible}
        aria-controls={listboxId}
        aria-activedescendant={highlightedIndex >= 0 ? `hsf-autocomplete-option-${highlightedIndex}` : undefined}
        aria-autocomplete="list"
      />
      {input && (
        <button
          type="button"
          className="hsf-search-clear"
          onClick={() => handleChange('')}
          aria-label="Clear"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {dropdownVisible && (
        <ul
          id={listboxId}
          className="hsf-autocomplete-dropdown"
          role="listbox"
        >
          {suggestions.map((sp, index) => (
            <li
              key={sp.id}
              id={`hsf-autocomplete-option-${index}`}
              className={`hsf-autocomplete-item${index === highlightedIndex ? ' hsf-autocomplete-item-active' : ''}`}
              role="option"
              aria-selected={index === highlightedIndex}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur before click registers
                handleSelect(sp)
              }}
            >
              <div className="hsf-autocomplete-name">
                {highlightMatch(sp.name, input)}
              </div>
              <div className="hsf-autocomplete-address">
                {highlightMatch(formatAddress(sp), input)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
