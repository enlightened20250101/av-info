import { v4 as uuidv4 } from "uuid";
import { Article } from "@/lib/schema";
import { limitText, slugify } from "@/lib/text";
import { RawSummary } from "@/fetchers/fetch_summaries";

export function normalizeSummary(raw: RawSummary, publishedAt: Date): Article {
  const slug = `${slugify(raw.title)}`;

  return {
    id: uuidv4(),
    type: "topic",
    slug,
    title: raw.title,
    summary: limitText(raw.summary, 140),
    body: raw.body,
    images: [],
    source_url: raw.source_url,
    affiliate_url: null,
    related_works: [],
    related_actresses: [],
    published_at: publishedAt.toISOString(),
    fetched_at: raw.fetched_at,
  };
}
