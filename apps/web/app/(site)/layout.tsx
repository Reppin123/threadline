import "./site.css";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteNav />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
