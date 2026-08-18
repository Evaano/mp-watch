/**
 * Site-wide switches.
 *
 * The deployment is public so it can be shared for feedback, but it is kept
 * out of search results until the data and the sourcing standards are settled.
 * Flip this one constant at launch; it drives the meta tag, the response
 * header and robots.txt together, so they cannot drift apart.
 */
export const ALLOW_INDEXING = false;

export const SITE_URL = "https://mp-watch-lac.vercel.app";
