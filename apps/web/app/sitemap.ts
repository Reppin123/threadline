import type { MetadataRoute } from "next";
import { GUIDES, PUBLISHED_ISO } from "@/components/site/data";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(PUBLISHED_ISO);
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    ...GUIDES.map((g) => ({ url: `${BASE}${g.href}`, lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${BASE}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/login`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE}/signup`, lastModified, changeFrequency: "yearly", priority: 0.6 },
  ];
}
