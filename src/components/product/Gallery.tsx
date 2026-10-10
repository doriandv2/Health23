"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Img = { id: string; url: string; alt: string };

export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    setActive(i);
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (images.length === 0) return <div className="aspect-square rounded-3xl bg-white ring-1 ring-line" />;

  return (
    <div className="lg:sticky lg:top-28">
      <div
        ref={track}
        className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-3xl bg-white ring-1 ring-line"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active) setActive(i);
        }}
      >
        {images.map((img, i) => (
          <div key={img.id} className="relative h-full w-full shrink-0 snap-center">
            <Image src={img.url} alt={img.alt || `${title} — image ${i + 1}`} fill priority={i === 0} sizes="(min-width:1024px) 600px, 100vw" className="object-contain p-6 sm:p-10" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
            {images.map((img, i) => <span key={img.id} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-ink" : "w-1.5 bg-ink/20"}`} />)}
          </div>
          <div className="no-scrollbar mt-4 hidden gap-3 overflow-x-auto sm:flex">
            {images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => go(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 transition ${i === active ? "ring-2 ring-ink" : "ring-line hover:ring-ink/30"}`}>
                <Image src={img.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
