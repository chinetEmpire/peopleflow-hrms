const cache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { 'User-Agent': 'flowHR/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const name: string | undefined = data?.display_name;
    if (!name) return null;

    const short = name.split(',').slice(0, 3).join(',').trim();
    cache.set(key, short);
    return short;
  } catch {
    return null;
  }
}
