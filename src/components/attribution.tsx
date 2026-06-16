import { cn } from "@/lib/utils";

/**
 * Reusable O*NET / data-source attribution.
 *
 * O*NET Web Services usage requires that the official attribution text,
 * trademark notice, and the "O*NET in-it" badge linking to
 * https://services.onetcenter.org/ remain visible wherever O*NET data is
 * shown. This component is rendered in the global footer (present on every
 * route via the root layout, so it cannot be removed by client navigation),
 * on the About page, and on the Data Sources page.
 *
 * Branding requirements honoured:
 *   - Official badge SVG, unmodified, at the documented dimensions.
 *   - Badge links to services.onetcenter.org and opens the O*NET site.
 *   - Trademark notice "O*NET® is a trademark of USDOL/ETA." kept intact.
 *   - Independence disclaimer shown alongside the attribution.
 */

export const ONET_BADGE_SRC =
  "https://www.onetcenter.org/image/link/onet-in-it.svg";
export const ONET_LINK = "https://services.onetcenter.org/";

export const ONET_ATTRIBUTION_TEXT =
  "This site incorporates information from O*NET Web Services by the U.S. " +
  "Department of Labor, Employment and Training Administration (USDOL/ETA). " +
  "O*NET® is a trademark of USDOL/ETA.";

export const INDEPENDENCE_DISCLAIMER =
  "This project is an independent visualization and analysis tool and is not " +
  "affiliated with or endorsed by the U.S. Department of Labor.";

export function OnetBadge({ className }: { className?: string }) {
  return (
    <a
      href={ONET_LINK}
      target="_blank"
      rel="noopener noreferrer"
      title="This site incorporates information from O*NET Web Services. Click to learn more."
      className={cn("inline-block shrink-0", className)}
    >
      {/* Official, unmodified O*NET in-it badge at documented dimensions. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ONET_BADGE_SRC}
        alt="O*NET in-it"
        width={130}
        height={60}
        style={{ width: 130, height: 60, border: "none" }}
      />
    </a>
  );
}

type Variant = "footer" | "full" | "compact";

export function Attribution({
  variant = "footer",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
        <OnetBadge />
        <p>
          Includes information from{" "}
          <a href={ONET_LINK} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            O*NET Web Services
          </a>
          . O*NET® is a trademark of USDOL/ETA.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 text-sm text-muted-foreground", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <OnetBadge />
        <div className="space-y-2">
          <p>
            This site incorporates information from{" "}
            <a
              href={ONET_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              O*NET Web Services
            </a>{" "}
            by the U.S. Department of Labor, Employment and Training
            Administration (USDOL/ETA). O*NET® is a trademark of USDOL/ETA.
          </p>
          {variant === "full" && (
            <p className="text-xs">{INDEPENDENCE_DISCLAIMER}</p>
          )}
        </div>
      </div>
    </div>
  );
}
