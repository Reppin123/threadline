import { ImageResponse } from "next/og";
import { getAllPosts, getPost } from "../_lib/posts";

export const alt = "Threadline blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f6f5f1", color: "#0b0c0f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 600 }}>
          <svg width="52" height="52" viewBox="0 0 32 32">
            <path d="M4 14.6C4 8.7 9.4 4 16 4s12 4.7 12 10.6-5.4 10.6-12 10.6c-1.4 0-2.7-.2-3.9-.6L6.2 27.4l1.6-5C5.4 20.4 4 17.7 4 14.6Z" fill="#0a7cff" />
            <path d="M10.5 15h11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <span>Threadline</span>
          <span style={{ marginLeft: 12, fontSize: 22, color: "#0a7cff", background: "#e6f1ff", padding: "6px 16px", borderRadius: 999 }}>{post?.category ?? "Blog"}</span>
        </div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1000 }}>{post?.title ?? "The Threadline blog"}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#5b5e66" }}>Your app, on iMessage · threadline blog</div>
      </div>
    ),
    size,
  );
}
