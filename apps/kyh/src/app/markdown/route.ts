import { projects, workHistory } from "@/lib/data";

export function GET() {
  const markdown = `# Kaiyu Hsu

Hello world. You can call me Kai since we're pretty much friends now. I enjoy creating things for the internet. By day, I get to do that through investing, advising, and building products you may not have heard of, yet.

Welcome to my corner of the web.

## Highlights

- Oversaw product growth from dozens to millions of users
- Published research on [growth and retention](https://www.ahajournals.org/doi/10.1161/circ.136.suppl_1.21029)
- Led software development at various [large](https://amazon.com) [organizations](https://grow.google/)
- Helped build the frontend framework for the [worlds largest retailer](https://techcrunch.com/2020/09/01/amazons-big-redesign-on-ios-to-reach-all-u-s-users-by-month-end/)
- Contributing member of [USDR](https://github.com/orgs/usdigitalresponse) and the [OpenJS](https://github.com/orgs/nodejs) Foundation
- Took startups through [acquisitions](https://www.crunchbase.com/organization/cardiogram), [IPOs](https://retailtouchpoints.com/features/news-briefs/slyce-to-go-public-following-merger), and several [failures](https://techcrunch.com/2020/03/03/atrium-shuts-down/)

## Work

${workHistory.map((w) => `- **${w.company}** - ${w.role} (${w.year}) - [${w.link}](${w.link})`).join("\n")}

## Projects

${projects.map((p) => `- **${p.title}** - ${p.description} - [${p.url}](${p.url})`).join("\n")}

## Other Activities

Beyond work, I love to learn about economics, psychology, and business. You'll occasionally find me dabbling in the open source world, drawing things, building apps, and designing games. But honestly, I spend most of my days procrastinating.

## Connect

- Website: [kyh.io](https://kyh.io)
- GitHub: [github.com/kyh](https://github.com/kyh)
- X: [x.com/kaiyuhsu](https://x.com/kaiyuhsu)
- LinkedIn: [linkedin.com/in/kyh](https://linkedin.com/in/kyh)
- Email: [hello@kyh.io](mailto:hello@kyh.io)
`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
