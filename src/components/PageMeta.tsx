import { Helmet } from "react-helmet-async";
import { APP_URL as SITE, NOINDEX } from "@/lib/siteEnv";

interface PageMetaProps {
  title: string;
  description: string;
  canonical?: string;
}

/**
 * Устанавливает уникальные <title>, meta description и canonical для страницы.
 * title должен быть < 60 символов, description — 50–160 символов.
 */
export function PageMeta({ title, description, canonical }: PageMetaProps) {
  const url = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${SITE}${canonical}`
    : undefined;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {NOINDEX && <meta name="robots" content="noindex,nofollow" />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
    </Helmet>
  );
}
