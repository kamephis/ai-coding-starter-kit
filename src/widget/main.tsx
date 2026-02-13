import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { parseDataLang } from './i18n'
import './styles.css'

// Auto-detect script base URL for API and CSS loading
function getScriptBase(): string {
  const scripts = document.querySelectorAll('script[src*="storefinder"]')
  for (const script of scripts) {
    const src = script.getAttribute('src')
    if (src) {
      try {
        const url = new URL(src, window.location.href)
        return url.href.replace(/\/[^/]*$/, '')
      } catch { /* ignore */ }
    }
  }
  return window.location.origin + '/widget'
}

function getApiBase(): string {
  const scripts = document.querySelectorAll('script[src*="storefinder"]')
  for (const script of scripts) {
    const src = script.getAttribute('src')
    if (src) {
      try {
        return new URL(src, window.location.href).origin
      } catch { /* ignore */ }
    }
  }
  return window.location.origin
}

// Inject CSS stylesheet
function injectStyles(base: string) {
  if (document.querySelector('link[data-hsf-styles]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${base}/storefinder.css`
  link.setAttribute('data-hsf-styles', '')
  document.head.appendChild(link)
}

function init() {
  const container = document.getElementById('heizmann-storefinder')
  if (!container) {
    console.error('[Heizmann Storefinder] Element #heizmann-storefinder not found')
    return
  }

  const scriptBase = getScriptBase()
  injectStyles(scriptBase)

  const apiBase = getApiBase()
  const initialLang = parseDataLang(container.getAttribute('data-lang'))
  const hideLangSwitcher = container.hasAttribute('data-hide-lang-switcher') &&
    container.getAttribute('data-hide-lang-switcher') !== 'false'

  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App apiBase={apiBase} initialLang={initialLang} hideLangSwitcher={hideLangSwitcher} />
    </React.StrictMode>
  )
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
