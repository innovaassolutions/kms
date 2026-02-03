import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/chat", "/upload", "/web-sources", "/status", "/api"],
      },
    ],
    sitemap: "https://novakms.innovaas.co/sitemap.xml",
  };
}
