import { absoluteUrl, siteConfig } from "@/lib/config";
import { workHistory } from "@/lib/data";
import { social } from "@/lib/social";

const PERSON_ID = `${siteConfig.url}/#person`;
const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

type PostalAddress = {
  "@type": "PostalAddress";
  addressLocality: string;
  addressRegion: string;
  addressCountry: string;
};

type ContactPoint = {
  "@type": "ContactPoint";
  contactType: string;
  email: string;
  url: string;
  availableLanguage: string[];
  areaServed: string;
};

type PersonNode = {
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
  address: PostalAddress;
  knowsAbout: string[];
  sameAs: string[];
};

type OrganizationNode = {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo: string;
  image: string;
  description: string;
  email: string;
  founder: { "@id": string };
  address: PostalAddress;
  contactPoint: ContactPoint[];
  sameAs: string[];
};

type WebSiteNode = {
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  alternateName: string;
  description: string;
  inLanguage: string;
  publisher: { "@id": string };
  about: { "@id": string };
};

export type StructuredData = {
  "@context": "https://schema.org";
  "@graph": [PersonNode, OrganizationNode, WebSiteNode];
};

const sameAs = [social.github, social.twitter, social.linkedin, social.dribbble];

/** Street address is deliberately omitted — this is a personal site, not an office. */
const address: PostalAddress = {
  "@type": "PostalAddress",
  addressLocality: siteConfig.location.city,
  addressRegion: siteConfig.location.region,
  addressCountry: siteConfig.location.country,
};

const currentRole = workHistory[0];

/**
 * JSON-LD identity graph. `Person` is the primary entity (this is a personal
 * site); `Organization` carries the contactPoint and address an agent needs to
 * verify who is behind the domain; `WebSite` ties the two to the URL.
 */
export const buildStructuredData = (): StructuredData => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: siteConfig.name,
      alternateName: ["Kai", siteConfig.shortName],
      url: siteConfig.url,
      mainEntityOfPage: absoluteUrl("/about"),
      image: `${siteConfig.url}/og.jpg`,
      description: siteConfig.description,
      email: `mailto:${siteConfig.email}`,
      jobTitle: currentRole?.role ?? "Software Engineer",
      worksFor: {
        "@type": "Organization",
        name: currentRole?.company ?? siteConfig.siteName,
        url: currentRole?.link ?? siteConfig.url,
      },
      address,
      knowsAbout: [
        "Software engineering",
        "Design engineering",
        "Frontend architecture",
        "Developer experience",
        "Venture capital",
      ],
      sameAs,
    },
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: siteConfig.siteName,
      url: siteConfig.url,
      logo: `${siteConfig.url}/favicon/web-app-manifest-512x512.png`,
      image: `${siteConfig.url}/og.jpg`,
      description: siteConfig.description,
      email: `mailto:${siteConfig.email}`,
      founder: { "@id": PERSON_ID },
      address,
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: siteConfig.email,
          url: absoluteUrl("/contact"),
          availableLanguage: ["English"],
          areaServed: "Worldwide",
        },
      ],
      sameAs,
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: siteConfig.url,
      name: siteConfig.siteName,
      alternateName: siteConfig.name,
      description: siteConfig.description,
      inLanguage: "en-US",
      publisher: { "@id": ORGANIZATION_ID },
      about: { "@id": PERSON_ID },
    },
  ],
});
