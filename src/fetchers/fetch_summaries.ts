import { getEnv } from "@/lib/env";
import { getLatestArticles, getLatestByType } from "@/lib/db";
import { Article } from "@/lib/schema";
import { toIsoString } from "@/lib/text";

export type RawSummary = {
  summary_id: string;
  title: string;
  summary: string;
  body: string;
  source_url: string;
  fetched_at: string;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildSummaryBody(works: Article[], topics: Article[]) {
  const workLines = works.slice(0, 10).map((work, idx) => `${idx + 1}. ${work.title} (${work.slug})`);
  const topicLines = topics
    .filter((topic) => !topic.source_url.startsWith("internal:ranking:"))
    .slice(0, 10)
    .map((topic, idx) => `${idx + 1}. ${topic.title}`);

  return [
    "作品ピックアップ:",
    ...workLines,
    "",
    "注目トピック:",
    ...topicLines,
  ].join("\n");
}

export async function fetchSummaries(): Promise<RawSummary[]> {
  const fetchedAt = toIsoString(new Date());
  const today = new Date();

  const weeklyKey = getEnv("SUMMARY_WEEKLY_KEY", formatDate(today));
  const monthlyKey = getEnv("SUMMARY_MONTHLY_KEY", today.toISOString().slice(0, 7));

  const works = await getLatestByType("work", 20);
  const topics = await getLatestByType("topic", 20);
  const all = await getLatestArticles(60);

  const weekTitle = `週間まとめ ${weeklyKey}`;
  const monthTitle = `月間まとめ ${monthlyKey}`;

  const weekBody = buildSummaryBody(works, topics);
  const monthBody = buildSummaryBody(works, topics);

  const weekSummary = `直近の新着${all.length}件から注目作とトピックをまとめました。`;
  const monthSummary = `今月の主要トピックと作品の動向を短く整理しています。`;

  return [
    {
      summary_id: `${weeklyKey}-weekly`,
      title: weekTitle,
      summary: weekSummary,
      body: weekBody,
      source_url: `internal:summary:weekly:${weeklyKey}`,
      fetched_at: fetchedAt,
    },
    {
      summary_id: `${monthlyKey}-monthly`,
      title: monthTitle,
      summary: monthSummary,
      body: monthBody,
      source_url: `internal:summary:monthly:${monthlyKey}`,
      fetched_at: fetchedAt,
    },
  ];
}
