export function Logo({ size = 26, word = true }: { size?: number; word?: boolean }) {
  return (
    <span className="logo" style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 650, fontSize: 17, letterSpacing: "-0.02em" }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0b0c0f" />
        <path d="M14 30c0-9 8-16 18-16s18 7 18 16-8 16-18 16c-2 0-4-.3-5.8-.8L17 49l2.6-7.4C16 38.7 14 34.6 14 30z" fill="#1d8cff" />
        <path d="M22 31h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {word && <span>Threadline</span>}
    </span>
  );
}
