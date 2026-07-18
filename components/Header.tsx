import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-base font-bold text-gray-800">
          領収書管理
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ダッシュボード
          </Link>
          <Link
            href="/receipts"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            領収書一覧
          </Link>
          {user && (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ログアウト
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  )
}
