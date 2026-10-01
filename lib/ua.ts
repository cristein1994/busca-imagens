export type UaInfo = {
  browser: string | null;
  os: string | null;
  device: string | null;
  botName: string | null;
};

const BOTS: [RegExp, string][] = [
  [/googlebot/i, "Googlebot"],
  [/bingbot/i, "Bingbot"],
  [/slackbot/i, "Slackbot"],
  [/twitterbot/i, "Twitterbot"],
  [/facebookexternalhit/i, "Facebook"],
  [/linkedinbot/i, "LinkedInBot"],
  [/discordbot/i, "Discordbot"],
  [/telegrambot/i, "TelegramBot"],
  [/whatsapp/i, "WhatsApp"],
  [/preview/i, "LinkPreview"],
  [/bot|crawler|spider|curl|wget|python-requests|httpclient/i, "Bot"],
];

export function parseUserAgent(ua: string | null | undefined): UaInfo {
  if (!ua) {
    return { browser: null, os: null, device: null, botName: null };
  }

  let botName: string | null = null;
  for (const [re, name] of BOTS) {
    if (re.test(ua)) {
      botName = name;
      break;
    }
  }

  let os: string | null = null;
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "Chrome OS";

  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (botName) browser = botName;

  let device: string | null = "Desktop";
  if (/ipad|tablet/i.test(ua)) device = "Tablet";
  else if (/mobi|iphone|android/i.test(ua)) device = "Mobile";
  else if (botName) device = "Bot";

  return { browser, os, device, botName };
}
