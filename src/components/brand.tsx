type IconProps = {
  className?: string;
  size?: number;
};

/** Primary Clay Inbox mark — green envelope. */
export function EmailLogo({ className, size = 48 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="10" width="56" height="44" rx="10" fill="#0F6A56" />
      <path
        d="M8 16.5L32 34L56 16.5"
        stroke="#D7EFE6"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 48L26 33.5"
        stroke="#9FD9C6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M54 48L38 33.5"
        stroke="#9FD9C6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="52" cy="14" r="7" fill="#14B88A" />
      <path
        d="M49.5 14.2L51.4 16.1L55 12.4"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Login hero diagram — mail network illustration. */
export function EmailNetworkDiagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Secure email delivery diagram"
    >
      <defs>
        <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8F6F0" />
          <stop offset="100%" stopColor="#F7FBF8" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0F6A56" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#14B88A" />
          <stop offset="100%" stopColor="#0F6A56" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <rect x="24" y="28" width="472" height="304" rx="28" fill="url(#panelGrad)" />
      <rect
        x="24"
        y="28"
        width="472"
        height="304"
        rx="28"
        stroke="#B7D5C8"
        strokeWidth="1.5"
      />

      {/* Grid */}
      {[80, 130, 180, 230, 280].map((y) => (
        <line
          key={y}
          x1="56"
          y1={y}
          x2="464"
          y2={y}
          stroke="#C5D4CA"
          strokeOpacity="0.45"
        />
      ))}

      {/* Nodes */}
      <circle cx="110" cy="180" r="34" fill="#0F6A56" />
      <path
        d="M90 170h40v24H90z"
        stroke="#D7EFE6"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M90 170l20 14 20-14"
        stroke="#D7EFE6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="260" cy="180" r="28" fill="#14B88A" />
      <path
        d="M248 180h24M260 168v24"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle cx="410" cy="180" r="34" fill="#0A4A3C" />
      <rect
        x="392"
        y="164"
        width="36"
        height="32"
        rx="6"
        stroke="#D7EFE6"
        strokeWidth="2.5"
      />
      <path
        d="M398 172h24M398 180h18M398 188h14"
        stroke="#9FD9C6"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Flow lines */}
      <path
        d="M144 180H232"
        stroke="url(#lineGrad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M288 180H376"
        stroke="url(#lineGrad)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <text
        x="110"
        y="248"
        textAnchor="middle"
        fill="#0A4A3C"
        fontFamily="Manrope, sans-serif"
        fontSize="14"
        fontWeight="600"
      >
        Plunk
      </text>
      <text
        x="260"
        y="248"
        textAnchor="middle"
        fill="#0A4A3C"
        fontFamily="Manrope, sans-serif"
        fontSize="14"
        fontWeight="600"
      >
        Secure relay
      </text>
      <text
        x="410"
        y="248"
        textAnchor="middle"
        fill="#0A4A3C"
        fontFamily="Manrope, sans-serif"
        fontSize="14"
        fontWeight="600"
      >
        Clay Inbox
      </text>

      <text
        x="260"
        y="68"
        textAnchor="middle"
        fill="#0F6A56"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="22"
        fontWeight="600"
      >
        Modern mail for clay-services.icu
      </text>
    </svg>
  );
}
