import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
  canonical?: string;
}

const SITE = "https://reage.life";

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
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
    </Helmet>
  );
}
