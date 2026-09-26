"use client";

import { useState } from "react";
import ProductGlyph from "@/components/ProductGlyph";

type IconType = "wave" | "orb" | "petal" | "spark" | "curve" | "drop" | "ring" | "bloom";

export default function BlogCardImage({
  image,
  icon,
  alt,
  glyphClassName = "max-h-20 max-w-20",
}: {
  image?: string;
  icon: IconType;
  alt: string;
  glyphClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return <ProductGlyph type={icon} className={glyphClassName} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
