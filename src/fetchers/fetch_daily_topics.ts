import { getEnv } from "@/lib/env";
import { toIsoString } from "@/lib/text";

export type RawTopic = {
  topic_id: string;
  title: string;
  summary: string;
  body: string;
  source_url: string;
  fetched_at: string;
};

const TOPIC_TEMPLATES = [
  {
    title: "本日の注目キーワード: {keyword}",
    summary: "{keyword}に関する検索動向と注目ポイントを整理しました。",
    body: "{keyword}が話題になっている背景と、関連する作品タグの動きを簡潔にまとめます。",
  },
  {
    title: "今日のトレンド: {keyword}",
    summary: "{keyword}の関連作が増加傾向。新着を中心に整理。",
    body: "新着作品のタグ傾向から、{keyword}が増えた理由をまとめています。",
  },
  {
    title: "人気タグレポート: {keyword}",
    summary: "{keyword}の露出が高い作品カテゴリをチェック。",
    body: "カテゴリ別の露出状況をメモし、関連作品への導線を更新しました。",
  },
  {
    title: "今日の話題: {keyword}",
    summary: "{keyword}に関する小さな変化を観測。",
    body: "検索動向の小さな変化を拾い、今後の注目ポイントをまとめます。",
  },
];

const KEYWORDS = [
  "新人",
  "独占配信",
  "4K",
  "高画質",
  "ランキング",
  "話題作",
  "注目女優",
  "期間限定",
  "特典",
  "セール",
  "本日配信",
  "先行配信",
];

export function fetchDailyTopics(): RawTopic[] {
  const count = Number(getEnv("TOPIC_DAILY_COUNT", "26"));
  const seed = getEnv("TOPIC_SEED", toIsoString(new Date()).slice(0, 10));
  const fetchedAt = toIsoString(new Date());

  const topics: RawTopic[] = [];

  for (let i = 0; i < count; i += 1) {
    const template = TOPIC_TEMPLATES[i % TOPIC_TEMPLATES.length];
    const keyword = KEYWORDS[(i + seed.length) % KEYWORDS.length];
    const title = template.title.replace("{keyword}", keyword);
    const summary = template.summary.replace("{keyword}", keyword);
    const body = template.body.replace("{keyword}", keyword);
    const topicId = `${seed}-${i + 1}`;
    const sourceUrl = `internal:topic:${topicId}`;

    topics.push({
      topic_id: topicId,
      title,
      summary,
      body,
      source_url: sourceUrl,
      fetched_at: fetchedAt,
    });
  }

  return topics;
}
