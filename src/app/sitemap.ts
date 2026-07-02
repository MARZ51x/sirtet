import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = clientEnv.NEXT_PUBLIC_SITE_URL;
  return ["/", "/leaderboard", "/settings", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/leaderboard" ? "hourly" : "weekly",
  }));
}
