'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import Map, { Marker, NavigationControl, type MapRef, type MarkerEvent, type ViewStateChangeEvent } from 'react-map-gl/mapbox';
import Supercluster from 'supercluster';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Clustered Mapbox map for /directory. Heavy (react-map-gl + mapbox-gl), so
 * DirectoryClient loads it with next/dynamic({ ssr: false }) only when the map
 * area is on screen.
 */

const DEFAULT_VIEW = { longitude: -98.5795, latitude: 39.8283, zoom: 4, pitch: 0, bearing: 0 };
const TRANSITION_DURATION = 1000;

const CLUSTER_CONFIG = {
  radius: 60,
  maxZoom: 16,
  minZoom: 0,
  expansionMaxZoom: 18,
};

export type DirectoryMapShop = { id: number; latitude: string | null; longitude: string | null };

type Bounds = { north: number; south: number; east: number; west: number };

type DirectoryMapProps = {
  /** Start zoomed in here (the visitor's location) instead of the whole US. */
  initialCenter?: { lat: number; lng: number } | null;
  shops: DirectoryMapShop[];
  mapboxToken: string;
  hoveredId: number | null;
  selectedId: number | null;
  onPinClick: (id: number) => void;
};

export default function DirectoryMap({ initialCenter, shops, mapboxToken, hoveredId, selectedId, onPinClick }: DirectoryMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<typeof DEFAULT_VIEW & { transitionDuration?: number }>(() =>
    initialCenter ? { ...DEFAULT_VIEW, latitude: initialCenter.lat, longitude: initialCenter.lng, zoom: 9 } : DEFAULT_VIEW
  );
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<{ bookshopId: number }>({
      radius: CLUSTER_CONFIG.radius,
      maxZoom: CLUSTER_CONFIG.maxZoom,
      minZoom: CLUSTER_CONFIG.minZoom,
    });
    index.load(
      shops.flatMap(s => {
        const lat = s.latitude ? parseFloat(s.latitude) : NaN;
        const lon = s.longitude ? parseFloat(s.longitude) : NaN;
        if (Number.isNaN(lat) || Number.isNaN(lon)) return [];
        return [{
          type: 'Feature' as const,
          properties: { bookshopId: s.id },
          geometry: { type: 'Point' as const, coordinates: [lon, lat] },
        }];
      })
    );
    return index;
  }, [shops]);

  const clusters = useMemo(() => {
    if (!bounds) return [];
    return clusterIndex.getClusters([bounds.west, bounds.south, bounds.east, bounds.north], Math.floor(viewState.zoom));
  }, [clusterIndex, bounds, viewState.zoom]);

  const updateBounds = useCallback(() => {
    try {
      const b = mapRef.current?.getMap()?.getBounds?.();
      if (b) setBounds({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    } catch {
      // Map not fully initialized
    }
  }, []);

  const handleClusterClick = useCallback(
    (clusterId: number, longitude: number, latitude: number) => {
      let zoom: number;
      try {
        zoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), CLUSTER_CONFIG.expansionMaxZoom);
      } catch {
        zoom = Math.min(viewState.zoom + 2, CLUSTER_CONFIG.expansionMaxZoom);
      }
      setViewState(prev => ({ ...prev, longitude, latitude, zoom, transitionDuration: TRANSITION_DURATION }));
    },
    [clusterIndex, viewState.zoom]
  );

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
      onMoveEnd={updateBounds}
      onLoad={() => setTimeout(updateBounds, 100)}
      mapboxAccessToken={mapboxToken}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="bottom-right" />

      {clusters.map(cluster => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const props = cluster.properties as { cluster?: boolean; point_count?: number; bookshopId?: number };
        const { cluster: isCluster, point_count: pointCount, bookshopId } = props;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              longitude={longitude}
              latitude={latitude}
              onClick={(e: MarkerEvent<MouseEvent>) => {
                e.originalEvent.stopPropagation();
                handleClusterClick(cluster.id as number, longitude, latitude);
              }}
            >
              <div className="cursor-pointer">
                <div className="relative bg-brand-teal rounded-full flex items-center justify-center shadow-lg hover:bg-brand-teal-hover transition-colors" style={{ width: 50, height: 50 }}>
                  <span className="font-sans font-bold text-white">{pointCount}</span>
                </div>
              </div>
            </Marker>
          );
        }

        const isHovered = hoveredId === bookshopId;
        const isSelected = selectedId === bookshopId;
        return (
          <Marker
            key={`bookshop-${bookshopId}`}
            longitude={longitude}
            latitude={latitude}
            onClick={(e: MarkerEvent<MouseEvent>) => {
              e.originalEvent.stopPropagation();
              onPinClick(bookshopId!);
            }}
          >
            <div className={`cursor-pointer transition-transform ${isSelected ? 'scale-125' : isHovered ? 'scale-110' : ''}`}>
              <MapPin className={`w-8 h-8 ${isSelected ? 'text-brand-orange' : isHovered ? 'text-brand-teal' : 'text-brand-brown'}`} fill="currentColor" />
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
