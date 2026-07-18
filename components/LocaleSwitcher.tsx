'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

export default function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: string) {
    // Replace the locale prefix in the current path
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => switchLocale('ja')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'ja'
            ? 'text-gray-800 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        JP
      </button>
      <span className="text-gray-200">|</span>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'en'
            ? 'text-gray-800 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        EN
      </button>
    </div>
  )
}
