/** Append or replace query params on a path like `/a/b?x=1` (path must start with `/`). */
export function withSearchParams(
  pathWithOptionalQuery: string,
  params: Record<string, string>
): string {
  const path = pathWithOptionalQuery.startsWith("/")
    ? pathWithOptionalQuery
    : `/${pathWithOptionalQuery}`
  const url = new URL(path, "https://_.internal")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return url.pathname + url.search
}
