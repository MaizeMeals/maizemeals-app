// Preview deploys must callback to this host, not production.
// NEXT_PUBLIC_SITE_URL, else the production host only when VERCEL_ENV is
// "production", else VERCEL_URL (no scheme; https is added below), else localhost.
export const getURL = () => {
  let url: string | undefined
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    url = process.env.NEXT_PUBLIC_SITE_URL
  } else if (process.env.VERCEL_ENV === 'production') {
    url = process.env.VERCEL_PROJECT_PRODUCTION_URL
  } else {
    url = process.env.VERCEL_URL
  }

  url = url || 'http://localhost:3000/'
  url = url.includes('http') ? url : `https://${url}`
  url = url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url

  return url
}
