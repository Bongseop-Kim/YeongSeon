import { Helmet } from "react-helmet-async";

interface PageSeoProps {
  title: string;
  description: string;
  ogImage?: string;
  ogUrl?: string;
  fullTitle?: boolean;
  robots?: string;
}

export function PageSeo({
  title,
  description,
  ogImage = "https://essesion.shop/logo/logo.png",
  ogUrl,
  fullTitle,
  robots,
}: PageSeoProps) {
  const resolvedTitle = fullTitle ? title : `${title} | ESSE SION`;
  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={description} />
      {robots && <meta name="robots" content={robots} />}
      {ogUrl && <link rel="canonical" href={ogUrl} />}
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {ogUrl && <meta property="og:url" content={ogUrl} />}
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
