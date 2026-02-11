import { useTranslation } from '../i18n'

interface RouteButtonProps {
  isLoading: boolean
  isActive: boolean
  onClick: () => void
}

export function RouteButton({ isLoading, isActive, onClick }: RouteButtonProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={`hsf-btn ${isActive ? 'hsf-btn-route-active' : 'hsf-btn-outline'}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <svg className="hsf-spinner" viewBox="0 0 24 24" width="16" height="16">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0 0 21 18.882V5.618a1 1 0 0 0-.553-.894L15 2m0 15V2m-6 5l6-5" />
        </svg>
      )}
      <span>{t('route.button')}</span>
    </button>
  )
}
