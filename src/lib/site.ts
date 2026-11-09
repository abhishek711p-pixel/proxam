import { BRAND } from "./config";

/** The live address of the site (no trailing slash). Set SITE_URL in the hosting settings before building. */
export const SITE_URL = (process.env.SITE_URL || "https://proxam.in").replace(/\/+$/, "");

export const SITE_TITLE = `${BRAND}: Free Test and Career Guidance for Class 10, 11, 12 (JEE, NEET, CUET)`;
export const SITE_DESC =
  "Free online MCQ test for Class 10, 11, 12 and droppers. Instant subject-wise result, stream guidance after Class 10 and a free counselling call. Science (PCM, PCB, PCMB) and Commerce.";
export const SITE_TITLE_HI = `${BRAND}: कक्षा 10, 11, 12 के लिए फ्री टेस्ट और करियर गाइडेंस (JEE, NEET, CUET)`;
export const SITE_DESC_HI =
  "कक्षा 10, 11, 12 और ड्रॉपर्स के लिए फ्री ऑनलाइन MCQ टेस्ट। तुरंत सब्जेक्ट-वाइज़ रिज़ल्ट, 10वीं के बाद स्ट्रीम गाइडेंस और फ्री काउंसलिंग कॉल। साइंस और कॉमर्स।";

/** JSON-LD block for a page (search engines read it; people do not see it). */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#org`,
  name: BRAND,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: SITE_DESC,
  areaServed: "IN",
};

export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: BRAND,
  url: SITE_URL,
  inLanguage: ["en-IN", "hi-IN"],
  publisher: { "@id": `${SITE_URL}/#org` },
};
