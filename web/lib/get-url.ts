export const getURL = () => {
  let url =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    'http://localhost:3000/'

  url = url.includes('http') ? url : `https://${url}`
  url = url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url

  return url
}
