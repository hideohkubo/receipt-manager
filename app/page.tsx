import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">領収書管理</h1>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-gray-600 text-sm">ようこそ、{user.email} さん</p>
        <p className="text-gray-400 text-sm mt-2">領収書の登録・検索機能は順次追加されます。</p>
      </main>
    </div>
  )
}
