import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'

import appCss from '../styles.css?url'
import { ToastProvider } from '@/components/Toast'

const siteUrl = 'https://policingice.com'
const siteName = 'Policing ICE'
const siteDescription =
  'Documenting and tracking incidents of ICE overreach across the United States. Community-driven accountability through video evidence.'

export const Route = createRootRoute({
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: siteName },
      { name: 'description', content: siteDescription },
      { name: 'theme-color', content: '#ffffff' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: siteName },
      { property: 'og:title', content: siteName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:url', content: siteUrl },
      { property: 'og:image', content: `${siteUrl}/og-image.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: siteName },
      { name: 'twitter:description', content: siteDescription },
      { name: 'twitter:image', content: `${siteUrl}/og-image.png` },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: siteUrl },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        href: '/favicon-96x96.png',
      },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          {children}
        </ToastProvider>
        <Scripts />
        <Analytics />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <p className="text-sm text-neutral-500">
          Not found.{' '}
          <Link
            to="/"
            className="underline underline-offset-2 hover:text-neutral-900"
          >
            Back
          </Link>
        </p>
      </div>
    </div>
  )
}
