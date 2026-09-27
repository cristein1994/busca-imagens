import { checkTor, torRequest } from "./tor";

export type ToolName = "web_search" | "fetch_url" | "tor_status";

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the public web through Tor (DuckDuckGo HTML). Returns titles, URLs, snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: {
            type: "integer",
            description: "Max results (1-8)",
            default: 5,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_url",
      description:
        "Fetch a URL through Tor and return stripped text content (HTML tags removed).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Absolute http(s) URL" },
          maxChars: {
            type: "integer",
            description: "Max characters to return",
            default: 8000,
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "tor_status",
      description: "Check whether outbound traffic exits via Tor and report exit IP.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

async function webSearch(query: string, limit = 5): Promise<string> {
  const capped = Math.min(Math.max(limit, 1), 8);
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await torRequest(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0",
      Accept: "text/html",
    },
    timeoutMs: 40000,
  });

  if (res.status >= 400) {
    return JSON.stringify({ error: `search HTTP ${res.status}`, body: res.body.slice(0, 400) });
  }

  const results: { title: string; url: string; snippet: string }[] = [];
  const blockRe =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/td>)/gi;

  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(res.body)) !== null && results.length < capped) {
    const href = decodeEntities(m[1]);
    const title = stripHtml(m[2]);
    const snippet = stripHtml(m[3] || m[4] || "");
    let finalUrl = href;
    try {
      const u = new URL(href, "https://duckduckgo.com");
      const uddg = u.searchParams.get("uddg");
      if (uddg) finalUrl = decodeURIComponent(uddg);
    } catch {
      /* keep href */
    }
    results.push({ title, url: finalUrl, snippet });
  }

  if (results.length === 0) {
    // looser fallback
    const loose =
      /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = loose.exec(res.body)) !== null && results.length < capped) {
      results.push({
        title: stripHtml(m[2]),
        url: decodeEntities(m[1]),
        snippet: "",
      });
    }
  }

  return JSON.stringify({ query, via: "tor", results }, null, 2);
}

async function fetchUrl(url: string, maxChars = 8000): Promise<string> {
  const capped = Math.min(Math.max(maxChars, 500), 20000);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return JSON.stringify({ error: "invalid url" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return JSON.stringify({ error: "only http(s) allowed" });
  }

  const res = await torRequest(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeoutMs: 45000,
  });

  const text = stripHtml(res.body).slice(0, capped);
  return JSON.stringify({
    url,
    status: res.status,
    via: "tor",
    contentType: res.headers["content-type"] || "",
    text,
  });
}

export async function runTool(
  name: string,
  argsJson: string,
): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? (JSON.parse(argsJson) as Record<string, unknown>) : {};
  } catch {
    return JSON.stringify({ error: "invalid tool arguments JSON" });
  }

  try {
    switch (name as ToolName) {
      case "web_search":
        return await webSearch(
          String(args.query || ""),
          Number(args.limit || 5),
        );
      case "fetch_url":
        return await fetchUrl(
          String(args.url || ""),
          Number(args.maxChars || 8000),
        );
      case "tor_status": {
        const st = await checkTor();
        return JSON.stringify(st);
      }
      default:
        return JSON.stringify({ error: `unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
