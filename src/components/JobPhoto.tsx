import Image from "next/image";

import { cn } from "@/lib/utils";

export function JobPhoto({
  storagePath,
  alt,
  className,
  sizes,
}: {
  storagePath: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const src = `/api/job-photo?path=${encodeURIComponent(storagePath)}`;
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        className="object-cover"
      />
    </div>
  );
}

