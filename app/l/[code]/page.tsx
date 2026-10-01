import { notFound } from "next/navigation";
import { SmartRedirect } from "@/app/components/SmartRedirect";
import { getLinkByCode } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ code: string }> };

export default async function TrackLinkPage({ params }: Props) {
  const { code } = await params;
  const link = getLinkByCode(code);
  if (!link) notFound();

  return (
    <SmartRedirect
      code={link.code}
      targetUrl={link.target_url}
      smartLogger={link.smart_logger === 1}
    />
  );
}
