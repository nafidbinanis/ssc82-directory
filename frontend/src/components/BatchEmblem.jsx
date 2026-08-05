export default function BatchEmblem({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="SSC 1982 batch emblem"
    >
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1.5 3" />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontFamily="'Source Serif 4', serif"
        fontWeight="700"
        fontSize="20"
        fill="currentColor"
      >
        82
      </text>
      <text
        x="32"
        y="49"
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="500"
        fontSize="5.5"
        letterSpacing="1.5"
        fill="currentColor"
      >
        SSC BATCH
      </text>
    </svg>
  );
}
