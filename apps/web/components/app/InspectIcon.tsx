// Inspect tab nav icon (agent inspect): a magnifier over lines, matching icons.tsx stroke style.
export const IInspect = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h10M4 11h6M4 16h5" /><circle cx="16" cy="15" r="3.5" /><path d="m18.6 17.6 2.4 2.4" />
  </svg>
);
