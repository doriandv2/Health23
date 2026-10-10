import Image from "next/image";
import Link from "next/link";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Red23 Elite Health Products — home" className="inline-flex shrink-0">
      <Image src="/images/logo.png" alt="Red23 Elite Health Products" width={440} height={163} priority className={className} />
    </Link>
  );
}
