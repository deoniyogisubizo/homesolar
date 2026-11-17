"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import type { ProductImage } from "@/types";

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectImage = useCallback(
    (index: number, scrollThumb = false) => {
      if (!images.length) return;
      const nextIndex = ((index % images.length) + images.length) % images.length;
      setActiveIndex(nextIndex);
      if (scrollThumb) {
        thumbRefs.current[nextIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    },
    [images.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") selectImage(activeIndex - 1);
      if (event.key === "ArrowRight") selectImage(activeIndex + 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, lightboxOpen, selectImage]);

  if (!images.length) return null;

  const activeImage = images[activeIndex] ?? images[0];

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[17%_minmax(0,1fr)] lg:gap-[1.6%]">
        <div className="order-2 flex items-center gap-2.5 lg:order-1 lg:mt-[0.2cqw] lg:flex-col lg:items-stretch lg:gap-0">
          <div className="flex flex-1 gap-2.5 overflow-x-auto pb-1 lg:flex-none lg:flex-col lg:gap-[12px] lg:overflow-visible lg:pb-0">
            {images.map((image, index) => {
              const selected = index === activeIndex;
              return (
                <button
                  key={`${image.src}-${index}`}
                  ref={(node) => {
                    thumbRefs.current[index] = node;
                  }}
                  type="button"
                  onClick={() => selectImage(index)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={selected}
                  className={`relative aspect-[112/132] w-[64px] shrink-0 overflow-hidden rounded-[8px] border-2 p-[1.5px] transition-colors duration-150 sm:w-[74px] lg:w-full lg:rounded-[0.8cqw] lg:border-[0.12cqw] lg:p-[0.15cqw] ${
                    selected ? "border-brand" : "border-transparent"
                  }`}
                >
                  <span className="relative block h-full w-full overflow-hidden rounded-[6px] bg-tile lg:rounded-[0.6cqw]">
                    <Image
                      src={image.thumbSrc ?? image.src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 1024px) 140px, 74px"
                      className="object-contain lg:object-cover"
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={() => selectImage(activeIndex + 1, true)}
              aria-label="Show next image"
              className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-ink transition-colors duration-150 hover:border-ink sm:h-[44px] sm:w-[44px] lg:mx-auto lg:mt-3 lg:h-[38px] lg:w-[38px] lg:border"
            >
              <ArrowDown className="h-3.5 w-3.5 lg:h-[15px] lg:w-[15px]" strokeWidth={1.7} />
            </button>
          ) : null}
        </div>

        <div className="relative order-1 min-h-[60vh] overflow-hidden rounded-[12px] bg-tile lg:order-2 lg:aspect-[4/5] lg:min-h-0 lg:rounded-[10px]">
          <Image
            src={activeImage.src}
            alt={activeImage.alt}
            fill
            priority
            sizes="(min-width: 1440px) 560px, (min-width: 1024px) 44vw, 100vw"
            className="object-contain lg:object-cover"
          />
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Zoom ${productName} image`}
            className="absolute bottom-[16px] right-[16px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-ink transition-colors duration-150 hover:text-brand sm:h-[40px] sm:w-[40px] lg:bottom-4 lg:right-4 lg:h-[38px] lg:w-[38px]"
          >
            <ZoomIn className="h-[16px] w-[16px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {lightboxOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image viewer`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-white/95 p-4 sm:p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-ink transition-colors duration-150 hover:border-ink sm:right-7 sm:top-7"
          >
            <X className="h-4.5 w-4.5" strokeWidth={1.7} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectImage(activeIndex - 1);
            }}
            aria-label="Previous image"
            className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-ink transition-colors duration-150 hover:border-ink sm:left-7"
          >
            <ChevronLeft className="h-4.5 w-4.5" strokeWidth={1.7} />
          </button>

          <div
            className="relative h-[72vh] w-[90vw] max-w-[1100px]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={activeImage.src}
              alt={activeImage.alt}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectImage(activeIndex + 1);
            }}
            aria-label="Next image"
            className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-ink transition-colors duration-150 hover:border-ink sm:right-7"
          >
            <ChevronRight className="h-4.5 w-4.5" strokeWidth={1.7} />
          </button>

          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-muted">
            {activeIndex + 1} / {images.length}
          </p>
        </div>
      ) : null}
    </>
  );
}
