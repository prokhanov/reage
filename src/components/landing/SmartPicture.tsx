import { forwardRef, type ImgHTMLAttributes } from "react";

interface SmartPictureProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** AVIF source URL (highest priority) */
  avif?: string;
  /** WebP source URL */
  webp?: string;
  /** Fallback src (PNG/JPG) — required */
  src: string;
  /** Optional wrapper className applied to <picture> element */
  pictureClassName?: string;
}

/**
 * Renders <picture> with AVIF + WebP sources and a fallback <img>.
 * Visually identical to a plain <img>; all layout classes should go on the <img>
 * (className prop) as they did before. Use this only for landing/large images.
 */
export const SmartPicture = forwardRef<HTMLImageElement, SmartPictureProps>(
  ({ avif, webp, src, pictureClassName, ...imgProps }, ref) => {
    return (
      <picture className={pictureClassName}>
        {avif && <source srcSet={avif} type="image/avif" />}
        {webp && <source srcSet={webp} type="image/webp" />}
        <img ref={ref} src={src} {...imgProps} />
      </picture>
    );
  },
);
SmartPicture.displayName = "SmartPicture";
