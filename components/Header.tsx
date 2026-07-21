import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import LocaleSwitcher from './LocaleSwitcher'

export default async function Header() {
  const t = await getTranslations()
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={`/${locale}/dashboard`} className="text-base font-bold text-gray-800 shrink-0">
          {t('app.title')}
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link href={`/${locale}/dashboard`} className="text-gray-500 hover:text-gray-800 transition-colors">
            {t('nav.dashboard')}
          </Link>
          <Link href={`/${locale}/receipts`} className="text-gray-500 hover:text-gray-800 transition-colors">
            {t('nav.receipts')}
          </Link>
          <Link href={`/${locale}/import/csv`} className="text-gray-500 hover:text-gray-800 transition-colors">
            {t('nav.import')}
          </Link>
          <Link href={`/${locale}/export`} className="text-gray-500 hover:text-gray-800 transition-colors">
            {t('nav.export')}
          </Link>
          <LocaleSwitcher />
          {user && (
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-gray-400 hover:text-gray-600 transition-colors">
                {t('nav.logout')}
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  )
}
