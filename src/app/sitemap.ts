import { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { getLatestArticles } from "@/lib/db";

const SITEMAP_PAGE_SIZE = 500;
const MAX_ARTICLES = 5000;

export async function generateSitemaps() {
  const total = (await getLatestArticles(MAX_ARTICLES)).length;
  const pages = Math.max(1, Math.ceil(total / SITEMAP_PAGE_SIZE));
  return Array.from({ length: pages }, (_, index) => ({ id: index }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = SITE.url.replace(/\/$/, "");
  const staticRoutes = [
    "",
    "/works",
    "/topics",
    "/actresses",
    "/tags",
    "/search",
    "/makers",
    "/genres",
  ];

  const articles = await getLatestArticles(MAX_ARTICLES);
  const start = id * SITEMAP_PAGE_SIZE;
  const pageItems = articles.slice(start, start + SITEMAP_PAGE_SIZE);

  const dynamicRoutes = pageItems.map((article) => {
    const prefix =
      article.type === "work"
        ? "works"
        : article.type === "actress"
          ? "actresses"
          : "topics";
    return {
      url: `${base}/${prefix}/${article.slug}`,
      lastModified: article.published_at ?? now.toISOString(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    };
  });

  const staticEntries =
    id === 0
      ? staticRoutes.map((route) => ({
          url: `${base}${route}`,
          lastModified: now.toISOString(),
          changeFrequency: "daily" as const,
          priority: route === "" ? 1 : 0.7,
        }))
      : [];

  return [...staticEntries, ...dynamicRoutes];
}
