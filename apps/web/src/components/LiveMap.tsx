import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * OpenStreetMap vector tiles via the style URL the API hands out. Only ever mounted when the
 * `maps` switch is on — with it off the API returns no style, and this component never renders.
 */
export function LiveMap({
  styleUrl,
  className,
  marker,
}: {
  styleUrl: string;
  className?: string;
  /** Centre on one point and pin it — e.g. a geocoded facility. */
  marker?: { lat: number; lng: number };
}) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: styleUrl,
      center: marker ? [marker.lng, marker.lat] : [-96.5, 38.5], // continental US
      zoom: marker ? 13 : 3.4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    if (marker) new maplibregl.Marker({ color: '#00ADD8' }).setLngLat([marker.lng, marker.lat]).addTo(map);
    return () => map.remove();
  }, [styleUrl, marker?.lat, marker?.lng]);

  return <div ref={el} className={className} />;
}
