import "../(site)/site.css";
import "./blog.css";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ScrollFx } from "@/components/site/ScrollFx";

// Same chrome as the (site) group; the blog lives outside it so it owns its own folder.
export default function BlogLayout({ children }: { children: React.ReactNode }) {
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
      <ScrollFx />
    </div>
  );
}
