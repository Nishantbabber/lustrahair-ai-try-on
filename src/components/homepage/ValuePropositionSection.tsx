import { MessageSquareHeart, Palette, CheckCircle2 } from "lucide-react";

export function ValuePropositionSection() {
  const cards = [
    {
      title: "Better consultations",
      description:
        "Help clients explore different hairstyles and colours before committing to a new look.",
      icon: MessageSquareHeart,
      tag: "Salon & Chair Workflow",
    },
    {
      title: "Personalised experiences",
      description:
        "Create a branded virtual try-on experience that reflects your salon or hair business.",
      icon: Palette,
      tag: "Custom Brand Identity",
    },
    {
      title: "More confident decisions",
      description:
        "Give customers a visual starting point for conversations about their next look.",
      icon: CheckCircle2,
      tag: "Hesitation Reduction",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-surface/60 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-medium text-champagne mb-3">
            Strategic Value for Hair Professionals
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-charcoal">
            More confidence in every hair decision.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-charcoal-muted leading-relaxed">
            Help clients see the possibilities before they sit in the styling
            chair or choose their next hairpiece.
          </p>
        </div>

        {/* 3 Refined Feature Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-8 shadow-soft transition-all duration-300 hover:border-champagne/60 hover:shadow-medium"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-champagne-light/40 text-champagne transition-colors group-hover:bg-champagne group-hover:text-ivory">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-xs text-charcoal-muted/60 font-semibold">
                      0{idx + 1}
                    </span>
                  </div>

                  <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-champagne mb-2">
                    {card.tag}
                  </span>

                  <h3 className="font-display text-xl sm:text-2xl text-charcoal tracking-tight">
                    {card.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">
                    {card.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/50 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-champagne" />
                  <span className="text-[12px] font-medium text-charcoal-muted">
                    Designed for client satisfaction
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
