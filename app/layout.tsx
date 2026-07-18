import type { ReactNode } from 'react'

// The [locale]/layout.tsx renders the full <html> and <body> tags.
// This root layout must not add any HTML wrapper to avoid hydration conflicts.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}

// Suppress Next.js warning about missing <html>/<body> in root layout
export const dynamic = 'force-dynamic'
