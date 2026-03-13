import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  caption?: string;
  priority?: boolean;
  size?: "sm" | "md";
};

export function BrandLogo({
  href,
  caption,
  priority = false,
  size = "md",
}: BrandLogoProps) {
  const content = (
    <div className="brand-lockup">
      <Image
        alt="FamFinance"
        className={`brand-logo-image size-${size}`}
        height={300}
        priority={priority}
        src="/logo-primary.png"
        width={760}
      />
      {caption ? <span className="brand-note">{caption}</span> : null}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link aria-label="Ir al inicio" className="brand-link" href={href}>
      {content}
    </Link>
  );
}
