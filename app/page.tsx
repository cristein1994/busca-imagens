import { HomeClient } from "@/components/HomeClient";
import { hasApifyToken } from "@/lib/apify";

export default function HomePage() {
  return <HomeClient configured={hasApifyToken()} />;
}
