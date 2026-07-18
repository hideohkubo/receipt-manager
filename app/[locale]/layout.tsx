import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import '../globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '領収書管理',
  description: '電子帳簿保存法対応 領収書管理システム',
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
