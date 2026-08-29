const cache = new Map<string, string>();

function pickAddressPart(address: Record<string, string> | undefined, ...keys: string[]): string | null {
  if (!address) return null;
  for (const key of keys) {
    if (address[key]) return address[key];
  }
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'flowHR/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const address: Record<string, string> | undefined = data?.address;
    if (!address) return null;

    const houseNumber = pickAddressPart(address, 'house_number');
    const road = pickAddressPart(address, 'road', 'pedestrian', 'footway', 'street');

    let short: string;
    if (road) {
      short = houseNumber ? `${houseNumber}, ${road}` : road;
    } else {
      const fallback = pickAddressPart(
        address,
        'suburb',
        'city_district',
        'town',
        'village',
        'city',
        'county',
        'state',
        'country',
      );
      if (!fallback) return null;
      short = fallback;
    }

    cache.set(key, short);
    return short;
  } catch {
    return null;
  }
}
