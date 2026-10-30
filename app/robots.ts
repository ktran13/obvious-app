import type { MetadataRoute } from "next";

import { buildRobotsRules } from "@/lib/seo/robots";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return buildRobotsRules({ siteUrl: SITE_URL });
}
