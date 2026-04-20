import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import { m } from "@/paraglide/messages";
import { I18nProvider, useLocale } from "@/lib/useI18n";
import { Button } from "@/components/ui/button";

const FeaturesBento = lazy(() =>
  import("@/components/ui/features-bento").then((module) => ({
    default: module.FeaturesBento,
  })),
);
const Footer = lazy(() => import("@/components/layout/Footer"));

export const Route = createFileRoute("/")({ component: HomePage });

function HomePageInner() {
  const { locale } = useLocale();
  const [showFeatures, setShowFeatures] = useState(false);
  const [showFooter, setShowFooter] = useState(false);
  const footerAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = footerAnchorRef.current;
    if (!node || showFooter || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowFooter(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [showFooter]);

  const heroCopy =
    locale === "zh-CN"
      ? {
          line1: "从智能体到",
          line2: "自动化。",
          subtitle: "编排、协同并扩展你的 AI 劳动力。",
        }
      : locale === "zh-TW"
        ? {
            line1: "從智能體到",
            line2: "自動化。",
            subtitle: "編排、協調並擴展你的 AI 勞動力。",
          }
        : {
            line1: "From Agents to",
            line2: "Automation.",
            subtitle: "Orchestrate, coordinate, and scale your AI workforce.",
          };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex h-screen -mt-14 items-start justify-center overflow-hidden px-6 pt-14 sm:px-10 lg:px-14">
          <div className="absolute inset-0 z-0">
            <img
              src="/background.png"
              alt=""
              className="size-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-start pt-16 text-left sm:pt-20 lg:pt-24">
            <p
              className="mb-3 max-w-3xl font-serif leading-tight text-white"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)" }}
            >
              {locale === "en" ? (
                <>
                  From <span className="italic">Agents</span> to
                </>
              ) : (
                heroCopy.line1
              )}
              <br />
              <span className="text-primary italic">{heroCopy.line2}</span>
            </p>
            <p className="mb-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              {heroCopy.subtitle}
            </p>
            <div className="flex flex-wrap items-center justify-start gap-3">
              <Button asChild className="h-auto rounded-2xl px-6 py-3 shadow-sm">
                <Link to="/dashboard">{m.open_dashboard()}</Link>
              </Button>
            </div>

            <div className="group mt-auto h-[180px] w-full self-center overflow-hidden rounded-t-md border-x border-t border-white/10 bg-black/20 shadow-2xl transition-[height] duration-300 ease-out backdrop-blur-sm hover:h-[260px] sm:h-[220px] sm:hover:h-[320px] lg:h-[260px] lg:hover:h-[400px]">
              <img
                src="/hero.png"
                alt="OrchOS Hero"
                className="h-full w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          onPointerEnter={() => setShowFeatures(true)}
          onFocus={() => setShowFeatures(true)}
          onTouchStart={() => setShowFeatures(true)}
        >
          {showFeatures ? (
            <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-muted/25" />}>
              <FeaturesBento />
            </Suspense>
          ) : (
            <div className="min-h-screen bg-zinc-50 dark:bg-muted/25" />
          )}
        </section>
        <div ref={footerAnchorRef} className="h-px w-full" />
      </main>
      {showFooter ? (
        <Suspense fallback={<div className="h-[45vh] bg-background" />}>
          <Footer />
        </Suspense>
      ) : (
        <div className="h-[45vh] bg-background" />
      )}
    </div>
  );
}

function HomePage() {
  return (
    <I18nProvider>
      <HomePageInner />
    </I18nProvider>
  );
}
