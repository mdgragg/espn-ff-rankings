export function proxyImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // Already a proxy URL or data URL
  if (url.startsWith("/api/") || url.startsWith("data:")) {
    return url;
  }

  // External ESPN image
  return `/api/espn/image?url=${encodeURIComponent(url)}`;
}
