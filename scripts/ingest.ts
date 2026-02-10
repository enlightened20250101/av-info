import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fetchFanzaWorks } from "@/fetchers/fetch_fanza_works";
import { fetchDailyTopics } from "@/fetchers/fetch_daily_topics";
import { fetchRankings } from "@/fetchers/fetch_rankings";
import { fetchSummaries } from "@/fetchers/fetch_summaries";
import { fetchRssTopics } from "@/fetchers/fetch_rss_topics";
import { normalizeFanzaWork } from "@/normalizers/normalize_work";
import { normalizeTopic } from "@/normalizers/normalize_topic";
import { normalizeRanking } from "@/normalizers/normalize_ranking";
import { normalizeSummary } from "@/normalizers/normalize_summary";
import { normalizeRssTopic } from "@/normalizers/normalize_rss_topic";
import { extractTags, pickRelatedWorks, tagLabel, tagSummary } from "@/lib/tagging";
import { findWorksByActressSlug, getLatestByType, upsertArticle } from "@/lib/db";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const LOG_DIR = path.join(process.cwd(), "logs");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logLine(message: string) {
  ensureLogDir();
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${message}`;
  console.log(line);
  const file = path.join(LOG_DIR, `ingest-${stamp.slice(0, 10)}.log`);
  fs.appendFileSync(file, `${line}\n`);
}

function schedulePublishedAt(index: number, total: number) {
  const now = new Date();
  const startHour = Number(process.env.PUBLISH_WINDOW_START ?? "9");
  const endHour = Number(process.env.PUBLISH_WINDOW_END ?? "23");
  const start = new Date(now);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(now);
  end.setHours(endHour, 0, 0, 0);

  const windowMs = Math.max(end.getTime() - start.getTime(), 60 * 60 * 1000);
  const step = windowMs / Math.max(total, 1);
  return new Date(start.getTime() + step * index);
}

function appendTagSummary(body: string, tags: string[]) {
  if (tags.length === 0) return body;

  const limited = tags.slice(0, 2);
  const lines = limited.map((tag) => `- #${tagLabel(tag)}: ${tagSummary(tag)}`);
  return `${body}\n\nタグ解説:\n${lines.join("\n")}`;
}

async function buildTopicLinks(text: string) {
  const works = await getLatestByType("work", 20);
  const tags = extractTags(text);
  const relatedWorks = pickRelatedWorks(works, tags, 6);
  const relatedActresses = Array.from(
    new Set(
      works
        .filter((work) => relatedWorks.includes(work.slug))
        .flatMap((work) => work.related_actresses)
    )
  ).slice(0, 6);

  return { relatedWorks, relatedActresses, tags };
}

async function ingestFanzaWorks() {
  const raws = await fetchFanzaWorks();
  const total = raws.length;

  let upserted = 0;
  let skipped = 0;
  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index];
    const publishedAt = schedulePublishedAt(index, total);
    const article = normalizeFanzaWork(raw, publishedAt);
    if (!article) {
      skipped += 1;
      continue;
    }

    if (article.related_actresses.length > 0) {
      const relatedSet = new Set<string>();
      for (const slug of article.related_actresses) {
        const works = await findWorksByActressSlug(slug, 4);
        works.forEach((work) => {
          if (work.slug !== article.slug) {
            relatedSet.add(work.slug);
          }
        });
      }
      article.related_works = Array.from(relatedSet).slice(0, 8);
    }

    // maker/genre を本文から拾って関連作品を補強
    const metaKeywords = article.body
      .split("\n")
      .filter((line) => line.startsWith("メーカー:") || line.startsWith("ジャンル:"))
      .map((line) => line.replace(/^.+?:\s*/, ""))
      .join(" ");
    if (metaKeywords) {
      const works = await getLatestByType("work", 80);
      const sameMeta = works
        .filter((work) => work.slug !== article.slug && work.body.includes(metaKeywords))
        .slice(0, 4)
        .map((work) => work.slug);
      article.related_works = Array.from(new Set([...article.related_works, ...sameMeta]));
    }

    const result = await upsertArticle(article);
    logLine(`FANZA work ${article.slug}: ${result.status}`);
    upserted += 1;
  }

  return { upserted, skipped, fetched: total };
}

async function ingestDailyTopics() {
  const raws = fetchDailyTopics();
  const total = raws.length;

  let upserted = 0;
  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index];
    const publishedAt = schedulePublishedAt(index, total);
    const article = normalizeTopic(raw, publishedAt);
    const linkSource = `${article.title} ${article.summary}`;
    const { relatedWorks, relatedActresses, tags } = await buildTopicLinks(linkSource);
    article.related_works = relatedWorks;
    article.related_actresses = relatedActresses;
    article.body = appendTagSummary(article.body, tags);
    const result = await upsertArticle(article);
    logLine(`Topic ${article.slug}: ${result.status}`);
    upserted += 1;
  }

  return { upserted, fetched: total };
}

async function ingestRankings() {
  const raws = await fetchRankings();
  const total = raws.length;

  let upserted = 0;
  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index];
    const publishedAt = schedulePublishedAt(index, total);
    const article = normalizeRanking(raw, publishedAt);
    const linkSource = `${article.title} ${article.summary}`;
    const { relatedWorks, relatedActresses, tags } = await buildTopicLinks(linkSource);
    article.related_works = relatedWorks;
    article.related_actresses = relatedActresses;
    article.body = appendTagSummary(article.body, tags);
    const result = await upsertArticle(article);
    logLine(`Ranking ${article.slug}: ${result.status}`);
    upserted += 1;
  }

  return { upserted, fetched: total };
}

async function ingestSummaries() {
  const raws = await fetchSummaries();
  const total = raws.length;

  let upserted = 0;
  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index];
    const publishedAt = schedulePublishedAt(index, total);
    const article = normalizeSummary(raw, publishedAt);
    const linkSource = `${article.title} ${article.summary}`;
    const { relatedWorks, relatedActresses, tags } = await buildTopicLinks(linkSource);
    article.related_works = relatedWorks;
    article.related_actresses = relatedActresses;
    article.body = appendTagSummary(article.body, tags);
    const result = await upsertArticle(article);
    logLine(`Summary ${article.slug}: ${result.status}`);
    upserted += 1;
  }

  return { upserted, fetched: total };
}

async function ingestRssTopics() {
  const raws = await fetchRssTopics();
  const total = raws.length;

  let upserted = 0;
  for (let index = 0; index < raws.length; index += 1) {
    const raw = raws[index];
    const publishedAt = raw.published_at ? new Date(raw.published_at) : schedulePublishedAt(index, total);
    const article = normalizeRssTopic(raw, publishedAt);
    const linkSource = `${article.title} ${article.summary}`;
    const { relatedWorks, relatedActresses, tags } = await buildTopicLinks(linkSource);
    article.related_works = relatedWorks;
    article.related_actresses = relatedActresses;
    article.body = appendTagSummary(article.body, tags);
    const result = await upsertArticle(article);
    logLine(`RSS ${article.slug}: ${result.status}`);
    upserted += 1;
  }

  return { upserted, fetched: total };
}

async function sendNotification(message: string) {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    logLine(`Notification failed: ${String(error)}`);
  }
}

async function run() {
  const startedAt = new Date();
  logLine("Ingest started");

  const tasks = [
    { name: "summaries", run: ingestSummaries },
    { name: "topics", run: ingestDailyTopics },
    { name: "rankings", run: ingestRankings },
    { name: "rss", run: ingestRssTopics },
    { name: "fanza", run: ingestFanzaWorks },
  ];

  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  let successCount = 0;
  const reportLines: string[] = [];

  results.forEach((result, index) => {
    const name = tasks[index].name;
    if (result.status === "fulfilled") {
      successCount += 1;
      logLine(`${name} completed: ${JSON.stringify(result.value)}`);
      reportLines.push(`${name}: ok ${JSON.stringify(result.value)}`);
    } else {
      logLine(`${name} failed: ${String(result.reason)}`);
      reportLines.push(`${name}: failed ${String(result.reason)}`);
    }
  });

  if (successCount === 0) {
    const message = "Ingest finished: no successful fetchers";
    const durationMs = Date.now() - startedAt.getTime();
    const summary = `Duration: ${Math.round(durationMs / 1000)}s | Success: ${successCount}/${tasks.length}`;
    logLine(message);
    await sendNotification(`${message}\n${summary}\n${reportLines.join("\n")}`);
    process.exit(1);
  }

  if (successCount < tasks.length) {
    const durationMs = Date.now() - startedAt.getTime();
    const summary = `Duration: ${Math.round(durationMs / 1000)}s | Success: ${successCount}/${tasks.length}`;
    await sendNotification(`Ingest finished with partial failures\n${summary}\n${reportLines.join("\n")}`);
    logLine("Ingest finished: partial success");
    return;
  }

  logLine("Ingest finished: success");
}

run().catch(async (error) => {
  const message = `Fatal error: ${String(error)}`;
  logLine(message);
  await sendNotification(message);
  process.exit(1);
});
