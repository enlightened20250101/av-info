import { v4 as uuidv4 } from "uuid";
import { Article } from "@/lib/schema";
import { limitText, slugify } from "@/lib/text";
import { RawRssItem } from "@/fetchers/fetch_rss_topics";

export function normalizeRssTopic(raw: RawRssItem, publishedAt: Date): Article {
  const dateSlug = publishedAt.toISOString().slice(0, 10);
  const slug = `${dateSlug}-${slugify(raw.title)}`;
  const summary = limitText(raw.summary || raw.title, 140);
  const body = `外部RSSの更新情報より:\n${summary}\n\n出典: ${raw.link}`;

  return {
    id: uuidv4(),
    type: "topic",
    slug,
    title: raw.title,
    summary,
    body,
    images: [],
    source_url: raw.link,
    affiliate_url: null,
    related_works: [],
    related_actresses: [],
    published_at: publishedAt.toISOString(),
    fetched_at: raw.fetched_at,
  };
}
