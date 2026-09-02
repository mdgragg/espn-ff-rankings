const PLACEHOLDER_IMAGE = "https://g.espncdn.com/lm-static/ffl/images/ffl-shield-icon.svg";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const swid = process.env.ESPN_SWID;
    const s2 = process.env.ESPN_S2;

    const headers: HeadersInit = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    };

    // Add ESPN-specific headers only for ESPN domains
    if (imageUrl.includes("fantasy.espn.com") || imageUrl.includes("espn.com")) {
      headers.Referer = "https://fantasy.espn.com/";
      if (swid && s2) {
        headers.Cookie = `espn_s2=${s2}; SWID=${swid}`;
      }
    }

    const response = await fetch(imageUrl, {
      headers,
    });

    if (!response.ok) {
      console.warn(
        `Failed to fetch image from ${imageUrl}: ${response.status} ${response.statusText}, using placeholder`,
      );
      // Redirect to placeholder on failure
      return Response.redirect(PLACEHOLDER_IMAGE, 307);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Check if the response is actually an image
    if (!contentType.includes("image/")) {
      console.warn(
        `Invalid content-type for ${imageUrl}: ${contentType}, using placeholder`,
      );
      return Response.redirect(PLACEHOLDER_IMAGE, 307);
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.warn(`Image proxy error for ${imageUrl}:`, error);
    // Return placeholder on any error
    return Response.redirect(PLACEHOLDER_IMAGE, 307);
  }
}
