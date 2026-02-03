import AuthGatedPage from "@/components/AuthGatedPage";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NovaKMS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Enterprise-grade knowledge management with AI. Process documents, audio, and video. Semantic search, RAG-powered chat with citations, and intelligent onboarding — all in one platform.",
    url: "https://novakms.innovaas.co",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Multi-modal document processing (PDF, DOCX, audio, video)",
      "Semantic search powered by AI embeddings",
      "RAG-powered chat with source citations",
      "Video frame extraction with Claude Vision",
      "Employee onboarding & institutional knowledge capture",
      "Files up to 5GB supported",
    ],
    creator: {
      "@type": "Organization",
      name: "Innovaas Solutions",
      url: "https://innovaas.co",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AuthGatedPage />
    </>
  );
}
