type GlyphType = "wave" | "orb" | "petal" | "spark" | "curve" | "drop" | "ring" | "bloom";

export default function ProductGlyph({
  type,
  className = "",
}: {
  type: GlyphType;
  className?: string;
}) {
  const common = "w-full h-full";
  switch (type) {
    case "wave":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <defs>
            <linearGradient id="g-wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C6A15B" />
              <stop offset="100%" stopColor="#B5687A" />
            </linearGradient>
          </defs>
          <path
            d="M30 100 C 60 40, 90 160, 120 100 S 170 40, 190 90"
            stroke="url(#g-wave)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="60" stroke="#3A2F3F" strokeWidth="1" fill="none" />
        </svg>
      );
    case "orb":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <defs>
            <radialGradient id="g-orb" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#E7CE9C" />
              <stop offset="100%" stopColor="#B5687A" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="105" r="55" fill="url(#g-orb)" />
          <ellipse cx="100" cy="105" rx="78" ry="30" stroke="#3A2F3F" strokeWidth="1" fill="none" />
        </svg>
      );
    case "petal":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <defs>
            <linearGradient id="g-petal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C6A15B" />
              <stop offset="100%" stopColor="#7A5164" />
            </linearGradient>
          </defs>
          <path
            d="M100 40 C 140 60, 150 120, 100 165 C 50 120, 60 60, 100 40 Z"
            fill="url(#g-petal)"
          />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <circle cx="75" cy="100" r="34" fill="#C6A15B" opacity="0.9" />
          <circle cx="128" cy="100" r="34" fill="#B5687A" opacity="0.85" />
          <circle cx="100" cy="100" r="10" fill="#F1E9E4" />
        </svg>
      );
    case "curve":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <path
            d="M60 170 C 40 120, 60 50, 120 40 C 150 35, 160 60, 140 75 C 110 95, 120 140, 90 165"
            stroke="#C6A15B"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "drop":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <path
            d="M100 35 C 130 80, 155 110, 155 135 A 55 55 0 1 1 45 135 C 45 110, 70 80, 100 35 Z"
            fill="#B5687A"
            opacity="0.9"
          />
          <path
            d="M100 35 C 130 80, 155 110, 155 135 A 55 55 0 1 1 45 135 C 45 110, 70 80, 100 35 Z"
            stroke="#C6A15B"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      );
    case "ring":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <defs>
            <linearGradient id="g-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E7CE9C" />
              <stop offset="100%" stopColor="#C6A15B" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="55" stroke="url(#g-ring)" strokeWidth="14" fill="none" />
          <circle cx="100" cy="100" r="80" stroke="#3A2F3F" strokeWidth="1" fill="none" />
        </svg>
      );
    case "bloom":
      return (
        <svg viewBox="0 0 200 200" className={`${common} ${className}`}>
          <defs>
            <radialGradient id="g-bloom" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#F1E9E4" />
              <stop offset="100%" stopColor="#C6A15B" />
            </radialGradient>
          </defs>
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="100"
              cy="100"
              rx="20"
              ry="46"
              fill="url(#g-bloom)"
              opacity="0.85"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
          <circle cx="100" cy="100" r="14" fill="#7A5164" />
        </svg>
      );
  }
}
