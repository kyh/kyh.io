import { createAPIFileRoute } from '@tanstack/react-start/api'
import { desc } from 'drizzle-orm'

import { db } from '@/db/index'
import { incidents } from '@/db/schema'

const siteUrl = 'https://policingice.com'

export const APIRoute = createAPIFileRoute('/api/sitemap.xml')({
  GET: async () => {
    const approvedIncidents = await db.query.incidents.findMany({
      where: (incidents, { and, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
        and(
          eqOp(incidents.status, 'approved'),
          isNullOp(incidents.deletedAt),
          ltOp(incidents.reportCount, 3),
        ),
      orderBy: [desc(incidents.createdAt)],
      columns: { id: true, createdAt: true },
    })

    const staticPages = [{ url: '/', priority: '1.0', changefreq: 'daily' }]

    const incidentPages = approvedIncidents.map((incident) => ({
      url: `/incident/${incident.id}`,
      lastmod: incident.createdAt
        ? new Date(incident.createdAt).toISOString().split('T')[0]
        : undefined,
      priority: '0.8',
      changefreq: 'weekly',
    }))

    const allPages = [...staticPages, ...incidentPages]

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${siteUrl}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  },
})
