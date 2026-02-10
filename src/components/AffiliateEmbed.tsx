"use client";

import { useEffect, useMemo, useRef } from "react";

type EmbedInfo = {
  className: string;
  scriptSrc: string;
  scriptId?: string;
};

function parseMgsEmbed(html: string): EmbedInfo | null {
  if (!html) return null;
  const scriptMatch = html.match(
    /<script[^>]+src="([^"]*(mgs_Widget_affiliate\.js|mgs_sample_movie\.js)[^"]*)"/i
  );
  if (!scriptMatch) return null;
  const classMatch = html.match(/<div\s+class="([^"]+)"/i);
  const idMatch = html.match(/<script[^>]+id="([^"]+)"/i);
  return {
    className: classMatch?.[1] ?? "",
    scriptSrc: scriptMatch[1],
    scriptId: idMatch?.[1],
  };
}

export function AffiliateEmbed({ embedHtml }: { embedHtml?: string | null }) {
  const embed = useMemo(() => parseMgsEmbed(embedHtml ?? ""), [embedHtml]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!embed) return;
    const container = containerRef.current;
    if (!container) return;

    const existing = embed.scriptId ? document.getElementById(embed.scriptId) : null;
    if (existing) existing.remove();

    const originalWrite = document.write;
    document.write = (html: string) => {
      container.insertAdjacentHTML("beforeend", html);
    };

    const script = document.createElement("script");
    if (embed.scriptId) script.id = embed.scriptId;
    script.src = embed.scriptSrc;
    script.async = true;
    script.charset = "utf-8";
    container.appendChild(script);

    const restore = () => {
      document.write = originalWrite;
    };
    script.addEventListener("load", restore);
    script.addEventListener("error", restore);

    return () => {
      restore();
      script.remove();
    };
  }, [embed?.scriptId, embed?.scriptSrc]);

  if (!embed) return null;

  return (
    <div className="mt-4">
      <style jsx global>{`
        .mgs-embed iframe,
        .mgs-embed video {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
      <div className="mgs-embed aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <div ref={containerRef} className="h-full w-full">
          <div className={embed.className || undefined} />
        </div>
      </div>
    </div>
  );
}
