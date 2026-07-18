import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  turbopack: {
    root: '/Users/hide/Desktop/programming/js/receipt-manager',
  },
}

export default withNextIntl(nextConfig)
