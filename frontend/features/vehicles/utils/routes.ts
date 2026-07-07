/** Static-export-safe vehicle detail URL (no dynamic [id] segment). */
export function vehicleViewPath(id: string) {
  return `/vehicles/view?id=${encodeURIComponent(id)}`;
}
