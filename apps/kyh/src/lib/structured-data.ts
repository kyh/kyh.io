import { absoluteUrl, siteConfig } from "@/lib/config";
import { workHistory } from "@/lib/data";
import { social } from "@/lib/social";

const PERSON_ID = `${siteConfig.url}/#person`;
const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

interface ContactPoint {
  "@type": "ContactPoint";
  contactType: string;
  email: string;
  url: string;
  availableLanguage: string[];
  areaServed: string;
}

interface PersonNode {
  "@type": "Person";
  "@id": string;
  name: string;
  alternateName: string[];
  url: string;
  mainEntityOfPage: string;
  image: string;
  description: string;
  email: string;
  jobTitle: string;
  worksFor: { "@type": "Organization"; name: string; url: string };
  knowsAbout: string[];
  sameAs: string[];
}

interface OrganizationNode {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo: string;
  image: string;
  description: string;
  email: string;
  founder: { "@id": string };
  contactPoint: ContactPoint[];
  sameAs: string[];
}

interface WebSiteNode {
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  alternateName: string;
  description: string;
  inLanguage: string;
  publisher: { "@id": string };
  about: { "@id": string };
}

export interface StructuredData {
  "@context": "https://schema.org";
  "@graph": [PersonNode, OrganizationNode, WebSiteNode];
}

const sameAs = [social.github, social.twitter, social.linkedin, social.dribbble];

const [currentRole] = workHistory;

/**
 * JSON-LD identity graph. `Person` is the primary entity (this is a personal
 * site); `Organization` carries the contactPoint an agent needs to verify who is
 * behind the domain; `WebSite` ties the two to the URL. No PostalAddress or
 * phone: a personal site has no office to list.
 */
export const buildStructuredData = (): StructuredData => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": PERSON_ID,
      "@type": "Person",
      alternateName: ["Kai", siteConfig.shortName],
      description: siteConfig.description,
      email: `mailto:${siteConfig.email}`,
      image: `${siteConfig.url}/og.jpg`,
      jobTitle: currentRole?.role ?? "Software Engineer",
      knowsAbout: [
        "Software engineering",
        "Design engineering",
        "Frontend architecture",
        "Developer experience",
        "Venture capital",
      ],
      mainEntityOfPage: absoluteUrl("/about"),
      name: siteConfig.name,
      sameAs,
      url: siteConfig.url,
      worksFor: {
        "@type": "Organization",
        name: currentRole?.company ?? siteConfig.siteName,
        url: currentRole?.link ?? siteConfig.url,
      },
    },
    {
      "@id": ORGANIZATION_ID,
      "@type": "Organization",
      contactPoint: [
        {
          "@type": "ContactPoint",
          areaServed: "Worldwide",
          availableLanguage: ["English"],
          contactType: "customer support",
          email: siteConfig.email,
          url: absoluteUrl("/contact"),
        },
      ],
      description: siteConfig.description,
      email: `mailto:${siteConfig.email}`,
      founder: { "@id": PERSON_ID },
      image: `${siteConfig.url}/og.jpg`,
      logo: `${siteConfig.url}/favicon/web-app-manifest-512x512.png`,
      name: siteConfig.siteName,
      sameAs,
      url: siteConfig.url,
    },
    {
      "@id": WEBSITE_ID,
      "@type": "WebSite",
      about: { "@id": PERSON_ID },
      alternateName: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "en-US",
      name: siteConfig.siteName,
      publisher: { "@id": ORGANIZATION_ID },
      url: siteConfig.url,
    },
  ],
});

/** Escapes `<` so a value containing `</script>` can't end the inline tag early. */
export const serializeStructuredData = (data: StructuredData) =>
  JSON.stringify(data).replaceAll("<", String.raw`<`);
