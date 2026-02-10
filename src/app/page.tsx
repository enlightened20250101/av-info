import Link from "next/link";
import { Metadata } from "next";
import { extractMetaTagsFromBody, extractTags, tagLabel } from "@/lib/tagging";
import { getLatestArticles, getLatestByType } from "@/lib/db";
import { buildPagination } from "@/lib/pagination";
import { Article } from "@/lib/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AV Info Lab | 自動更新AV情報",
  description: "FANZA作品を含む最新AV情報を毎日自動更新。新着、ランキング変動、トピックを集約。",
  openGraph: {
    title: "AV Info Lab | 自動更新AV情報",
    description: "FANZA作品を含む最新AV情報を毎日自動更新。新着、ランキング変動、トピックを集約。",
    type: "website",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildPopularTags(texts: string[], limit = 8) {
  const counts = new Map<string, number>();
  texts.forEach((text) => {
    extractTags(text).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function buildPopularMetaTags(works: Article[], prefix: string, limit = 8) {
  const counts = new Map<string, number>();
  works.forEach((work) => {
    extractMetaTagsFromBody(work.body)
      .filter((tag) => tag.startsWith(prefix))
      .forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const latest = await getLatestArticles(100);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(latest.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const latestPage = latest.slice(start, start + perPage);

  const latestWorks = await getLatestByType("work", 50);
  const latestTopics = await getLatestByType("topic", 12);
  const summaryTopics = latestTopics.filter((topic) =>
    topic.source_url.startsWith("internal:summary:")
  );
  const rankingTopics = latestTopics.filter((topic) =>
    topic.source_url.startsWith("internal:ranking:")
  );
  const dailyTopics = latestTopics.filter(
    (topic) =>
      !topic.source_url.startsWith("internal:ranking:") &&
      !topic.source_url.startsWith("internal:summary:")
  );

  const popularTags = buildPopularTags(
    dailyTopics.map((topic) => `${topic.title} ${topic.summary}`)
  );
  const popularGenres = buildPopularMetaTags(latestWorks, "genre:");

  return (
    <div className="min-h-screen px-6 pb-16 pt-12 sm:px-10">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Auto Updates</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              AV Info Lab
            </h1>
          </div>
          <div className="rounded-full bg-accent-soft px-4 py-2 text-xs font-semibold text-accent">
            Daily Automation
          </div>
        </div>
        <p className="max-w-2xl text-base text-muted">
          FANZA作品を含む最新情報を毎日自動更新。新着、今日の作品、関連リンクを自動生成しています。
        </p>
      </header>

      <section className="mx-auto mt-8 w-full max-w-5xl rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">検索・フィルタ</h2>
            <p className="text-xs text-muted">作品番号・女優・タグで検索</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted hover:border-accent/40"
              >
                #{tagLabel(tag)}
              </Link>
            ))}
          </div>
        </div>
        <form action="/search" method="get" className="mt-4 grid gap-2 sm:grid-cols-[1.6fr_auto]">
          <input
            name="q"
            placeholder="作品番号・女優・#タグを入力"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            検索
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/search?q=SSIS"
            className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-muted hover:border-accent/40"
          >
            作品番号で検索
          </Link>
          <Link
            href="/search?q=actress"
            className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-muted hover:border-accent/40"
          >
            女優で検索
          </Link>
          <Link
            href="/search?q=%23新人"
            className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-muted hover:border-accent/40"
          >
            タグで検索
          </Link>
        </div>
      </section>

      {popularTags.length > 0 ? (
        <section className="mx-auto mt-8 w-full max-w-5xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">人気タグ</h2>
            <span className="text-xs text-muted">今日のトピックから算出</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted hover:border-accent/40"
              >
                #{tagLabel(tag)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {popularGenres.length > 0 ? (
        <section className="mx-auto mt-6 w-full max-w-5xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">人気ジャンル</h2>
            <span className="text-xs text-muted">最新作品から算出</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {popularGenres.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted hover:border-accent/40"
              >
                {tagLabel(tag)}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-10 w-full max-w-5xl rounded-3xl border border-border bg-card p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">今日の作品</h2>
          <span className="text-xs text-muted">FANZA 2-3件/日</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {latestWorks.slice(0, 3).map((work) => (
            <Link
              key={work.id}
              href={`/works/${work.slug}`}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 transition hover:-translate-y-1 hover:border-accent/40"
            >
              {work.images[0]?.url ? (
                <img
                  src={work.images[0].url}
                  alt={work.images[0].alt}
                  className="h-40 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl bg-accent-soft text-xs text-accent">
                  No Image
                </div>
              )}
              <div>
                <p className="text-xs text-muted">{work.slug}</p>
                <h3 className="mt-1 text-sm font-semibold leading-snug">
                  {work.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">週間・月間まとめ</h2>
          <span className="text-xs text-muted">自動生成</span>
        </div>
        {summaryTopics.length === 0 ? (
          <p className="mt-3 text-sm text-muted">まだまとめ記事がありません。</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summaryTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.slug}`}
                className="rounded-2xl border border-border bg-white px-4 py-3 transition hover:border-accent/40"
              >
                <p className="text-xs text-muted">{formatDate(topic.published_at)}</p>
                <p className="mt-1 text-sm font-semibold">{topic.title}</p>
                <p className="mt-1 text-xs text-muted">{topic.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ランキング変動</h2>
          <span className="text-xs text-muted">シミュレーション</span>
        </div>
        {rankingTopics.length === 0 ? (
          <p className="mt-3 text-sm text-muted">まだランキング情報がありません。</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {rankingTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.slug}`}
                className="rounded-2xl border border-border bg-white px-4 py-3 transition hover:border-accent/40"
              >
                <p className="text-xs text-muted">{formatDate(topic.published_at)}</p>
                <p className="mt-1 text-sm font-semibold">{topic.title}</p>
                <p className="mt-1 text-xs text-muted">{topic.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">今日のトピック</h2>
          <span className="text-xs text-muted">自動生成</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {dailyTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              className="rounded-2xl border border-border bg-white px-4 py-3 transition hover:border-accent/40"
            >
              <p className="text-xs text-muted">{formatDate(topic.published_at)}</p>
              <p className="mt-1 text-sm font-semibold">{topic.title}</p>
              <p className="mt-1 text-xs text-muted">{topic.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">新着一覧</h2>
          <span className="text-xs text-muted">最新100件</span>
        </div>
        <div className="mt-4 grid gap-3">
          {latestPage.map((article) => (
            <Link
              key={article.id}
              href={`/${article.type === "work" ? "works" : article.type === "actress" ? "actresses" : "topics"}/${article.slug}`}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-white px-5 py-4 transition hover:border-accent/40"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                  {article.type}
                </span>
                <span className="text-xs text-muted">{formatDate(article.published_at)}</span>
              </div>
              <div>
                <p className="text-xs text-muted">{article.slug}</p>
                <h3 className="text-base font-semibold">{article.title}</h3>
                <p className="mt-1 text-sm text-muted">{article.summary}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>
            {latest.length}件中 {start + 1}-{Math.min(start + perPage, latest.length)}件
          </span>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <Link
                href={`/?page=${safePage - 1}`}
                className="rounded-full border border-border bg-white px-3 py-1 hover:border-accent/40"
              >
                前へ
              </Link>
            ) : null}
            {buildPagination(safePage, totalPages).map((pageNum, index) =>
              pageNum === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted">
                  ...
                </span>
              ) : (
                <Link
                  key={pageNum}
                  href={`/?page=${pageNum}`}
                  className={`rounded-full px-3 py-1 ${
                    pageNum === safePage
                      ? "bg-accent text-white"
                      : "border border-border bg-white hover:border-accent/40"
                  }`}
                >
                  {pageNum}
                </Link>
              )
            )}
            {safePage < totalPages ? (
              <Link
                href={`/?page=${safePage + 1}`}
                className="rounded-full border border-border bg-white px-3 py-1 hover:border-accent/40"
              >
                次へ
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
