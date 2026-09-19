import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

/**
 * OpenStreetMap vector tiles via the style URL the API hands out. Only ever mounted when the
 * `maps` switch is on — with it off the API returns no style, and this component never renders.
 */
export function LiveMap({ styleUrl, className }: { styleUrl: string; className?: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: styleUrl,
      center: [-96.5, 38.5], // continental US
      zoom: 3.4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    return () => map.remove();
  }, [styleUrl]);

  return <div ref={el} className={className} />;
}
