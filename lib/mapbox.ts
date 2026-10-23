/**
 * Public Mapbox token for client maps, read on the server and passed down as a
 * prop (it's a pk.* token, restricted by URL in the Mapbox dashboard).
 */
export function getMapboxToken(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_ACCESS_TOKEN || '';
}
