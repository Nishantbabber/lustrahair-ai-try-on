import Image from "next/image";
import { Upload, Sparkles, SlidersHorizontal, Check } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Upload",
      description: "Upload a photo and start exploring different looks.",
      icon: Upload,
      renderVisual: () => (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-ivory-dark">
          <Image
            src="/images/hero/lustrahair-before.jpg"
            alt="Client portrait upload example"
            fill
            sizes="(max-width: 768px) 100vw, 30vw"
            className="object-cover object-top opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded bg-surface/90 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-xs font-medium text-charcoal">
              Portrait Uploaded
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-champagne">
              <Check className="h-3 w-3" /> Ready
            </span>
          </div>
        </div>
      ),
    },
    {
      number: "02",
      title: "Explore",
      description:
        "Choose hairstyles, lengths, textures and colours from your business catalogue.",
      icon: SlidersHorizontal,
      renderVisual: () => (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-ivory-dark p-3 flex flex-col justify-between">
          {/* Micro style cards preview */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative aspect-square overflow-hidden rounded border border-champagne bg-surface shadow-soft">
              <Image
                src="/images/looks/signature-waves.png"
                alt="Signature Waves thumbnail"
                fill
                sizes="100px"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded border border-border bg-surface">
              <Image
                src="/images/looks/modern-bob.png"
                alt="Modern Bob thumbnail"
                fill
                sizes="100px"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded border border-border bg-surface">
              <Image
                src="/images/looks/soft-layers.png"
                alt="Soft Layers thumbnail"
                fill
                sizes="100px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Color swatch selector micro-preview */}
          <div className="rounded bg-surface/95 p-2 shadow-soft border border-border">
            <div className="flex items-center justify-between text-[11px] text-charcoal-muted mb-1.5 font-medium">
              <span>Selected Shade</span>
              <span className="text-charcoal font-semibold">Honey Blonde</span>
            </div>
            <div className="flex gap-2">
              <span
                className="h-4 w-4 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: "#1a1410" }}
                title="Natural Black"
              />
              <span
                className="h-4 w-4 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: "#3d2314" }}
                title="Espresso"
              />
              <span
                className="h-4 w-4 rounded-full border border-border shadow-xs"
                style={{ backgroundColor: "#6b3a2a" }}
                title="Chestnut"
              />
              <span
                className="h-4 w-4 rounded-full ring-2 ring-champagne border border-ivory shadow-xs"
                style={{ backgroundColor: "#c9a66b" }}
                title="Honey Blonde"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      number: "03",
      title: "Visualise",
      description:
        "See an AI-generated preview of how a new look could complement you.",
      icon: Sparkles,
      renderVisual: () => (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-ivory-dark">
          <Image
            src="/images/hero/lustrahair-after.jpg"
            alt="AI-generated virtual hairstyle preview"
            fill
            sizes="(max-width: 768px) 100vw, 30vw"
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded bg-surface/90 px-3 py-1.5 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-charcoal">
              <Sparkles className="h-3.5 w-3.5 text-champagne" /> AI Result
            </span>
            <span className="text-[11px] text-charcoal-muted">
              22&quot; Waves · Blonde
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-medium text-champagne mb-3">
            Intuitive Client Workflow
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-charcoal">
            Your next look, visualised in three simple steps.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-charcoal-muted leading-relaxed">
            Designed for seamless in-salon tablet consultations or remote
            exploration on your salon website.
          </p>
        </div>

        {/* 3 Step Connected Grid */}
        <div className="mt-16 relative">
          {/* Subtle connecting line for desktop */}
          <div
            className="hidden lg:block absolute top-28 left-[18%] right-[18%] h-0.5 bg-gradient-to-r from-champagne-light via-champagne to-champagne-light opacity-50 -z-0"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 relative z-10">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative flex flex-col rounded-xl border border-border bg-surface p-6 shadow-soft transition-all duration-300 hover:border-champagne/60 hover:shadow-medium"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-display text-2xl font-bold text-champagne">
                      {step.number}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne-light/40 text-champagne">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Step Visual Preview */}
                  <div className="mb-6">{step.renderVisual()}</div>

                  {/* Step Copy */}
                  <h3 className="font-display text-xl text-charcoal">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Transparency Notice */}
        <div className="mt-10 mx-auto max-w-xl text-center">
          <p className="text-xs text-charcoal-muted/70">
            *Previews are generated by AI models to simulate hairstyle and
            colour fit. Photos are processed ephemerally in memory without being stored.
          </p>
        </div>
      </div>
    </section>
  );
}
