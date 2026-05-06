import type { MetadataRoute } from 'next';

/** Management URLs are capability secrets — keep crawlers away from /m/. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/m/' },
  };
}
