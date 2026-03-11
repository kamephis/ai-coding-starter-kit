import { useTranslation } from '../i18n'

export type SortOption = 'distance' | 'nameAZ' | 'nameZA' | 'plz' | 'cityAZ'

interface SortSelectorProps {
  value: SortOption
  onChange: (value: SortOption) => void
  distanceAvailable: boolean
  disabled?: boolean
}

const SORT_OPTIONS: SortOption[] = ['distance', 'nameAZ', 'nameZA', 'plz', 'cityAZ']

export function SortSelector({ value, onChange, distanceAvailable, disabled }: SortSelectorProps) {
  const { t } = useTranslation()

  const labels: Record<SortOption, string> = {
    distance: distanceAvailable
      ? t('sort.distance')
      : `${t('sort.distance')} (${t('sort.requiresPosition')})`,
    nameAZ: t('sort.nameAZ'),
    nameZA: t('sort.nameZA'),
    plz: t('sort.plz'),
    cityAZ: t('sort.cityAZ'),
  }

  return (
    <div className="hsf-sort">
      <label className="hsf-sort-label">{t('sort.label')}:</label>
      <select
        className="hsf-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        disabled={disabled}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt} value={opt} disabled={opt === 'distance' && !distanceAvailable}>
            {labels[opt]}
          </option>
        ))}
      </select>
    </div>
  )
}
