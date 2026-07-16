import { forwardRef, type ImgHTMLAttributes } from "react";

interface SmartPictureProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "fetchPriority"> {
  /** AVIF source URL (highest priority) */
  avif?: string;
  /** WebP source URL */
  webp?: string;
  /** Fallback src (PNG/JPG) — required */
  src: string;
  /** Optional wrapper className applied to <picture> element */
  pictureClassName?: string;
  /**
   * Lowercase-only to match the DOM attribute. React <18.3 doesn't recognize
   * the camelCase `fetchPriority` prop and warns in console.
   */
  fetchpriority?: "high" | "low" | "auto";
}

/**
 * Renders <picture> with AVIF + WebP sources and a fallback <img>.
 * Visually identical to a plain <img>; layout classes go on the <img> via className.
 */
export const SmartPicture = forwardRef<HTMLImageElement, SmartPictureProps>(
  ({ avif, webp, src, pictureClassName, fetchpriority, ...imgProps }, ref) => {
    // Spread as raw DOM attr to avoid React camelCase warnings on older React.
    const extraAttrs = fetchpriority ? ({ fetchpriority } as Record<string, string>) : undefined;
    return (
      <picture className={pictureClassName}>
        {avif && <source srcSet={avif} type="image/avif" />}
        {webp && <source srcSet={webp} type="image/webp" />}
        <img ref={ref} src={src} {...imgProps} {...extraAttrs} />
      </picture>
    );
  },
);
SmartPicture.displayName = "SmartPicture";
