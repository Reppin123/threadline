import Link from "next/link";

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <path
        d="M4 14.6C4 8.7 9.4 4 16 4s12 4.7 12 10.6-5.4 10.6-12 10.6c-1.4 0-2.7-.2-3.9-.6L6.2 27.4l1.6-5C5.4 20.4 4 17.7 4 14.6Z"
        fill="var(--blue)"
      />
      <path d="M10.5 15h11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Threadline — home">
      <LogoMark />
      <span className="logo-word">Threadline</span>
    </Link>
  );
}
