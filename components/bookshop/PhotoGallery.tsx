'use client';

import { useState } from 'react';
import BookshopImage from '@/components/BookshopImage';

export type GalleryPhoto = {
  /** 1200px image. */
  src: string;
  /** Optional 400px and 800px versions, offered to smaller screens via srcset. */
  thumbSrc?: string;
  mediumSrc?: string;
  alt: string;
  /** Photographer credit, shown under the photo as "Photo: {name} via Google". */
  credit?: { name: string; url?: string | null } | null;
};

function srcSet({ src, thumbSrc, mediumSrc }: GalleryPhoto): string | undefined {
  const entries = [thumbSrc && `${thumbSrc} 400w`, mediumSrc && `${mediumSrc} 800w`].filter(Boolean);
  return entries.length ? [...entries, `${src} 1200w`].join(', ') : undefined;
}

/** Main photo with credit; thumbnails to switch between photos when there's more than one. */
export default function PhotoGallery({ photos, fallbackSrc }: { photos: GalleryPhoto[]; fallbackSrc: string }) {
  const [index, setIndex] = useState(0);
  const photo = photos[index];
  if (!photo) return null;

  return (
    <figure>
      <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-brand-cream">
        <BookshopImage
          src={photo.src}
          srcSet={srcSet(photo)}
          sizes="(min-width: 1024px) 760px, 100vw"
          alt={photo.alt}
          className="w-full h-full object-cover"
          fallbackSrc={fallbackSrc}
          priority={index === 0}
        />
      </div>
      {photo.credit?.name && (
        <figcaption className="mt-2 text-xs text-gray-500">
          Photo:{' '}
          {photo.credit.url ? (
            <a href={photo.credit.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
              {photo.credit.name}
            </a>
          ) : (
            photo.credit.name
          )}{' '}
          via Google
        </figcaption>
      )}
      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-pressed={i === index}
              className={`aspect-square rounded-md overflow-hidden border-2 ${i === index ? 'border-brand-teal' : 'border-transparent'}`}
            >
              <BookshopImage src={p.src} alt="" className="w-full h-full object-cover" fallbackSrc={fallbackSrc} />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
