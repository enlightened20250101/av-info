import { v4 as uuidv4 } from "uuid";
import { Article } from "@/lib/schema";
import { limitText, slugify } from "@/lib/text";
import { RawRanking } from "@/fetchers/fetch_rankings";

export function normalizeRanking(raw: RawRanking, publishedAt: Date): Article {
  const dateSlug = raw.ranking_id.split("-").slice(0, 3).join("-");
  const slug = `${dateSlug}-${slugify(raw.title)}`;

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
