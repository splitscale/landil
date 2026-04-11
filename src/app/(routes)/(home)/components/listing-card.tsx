import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { formatPrice } from "@/lib/format";

export type ListingCardData = {
  id: string;
  title: string;
  city: string;
  province: string;
  propertyType: string;
  lotArea: string;
  askingPrice: number;
  coverUrl?: string | null;
  sellerName?: string | null;
  sellerUsername?: string | null;
};

export default function ListingCard({ item }: { item: ListingCardData }) {
  return (
    <article className="group rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link href={`/listings/${item.id}`} className="block p-4">
        <div className="mb-3 overflow-hidden rounded-lg border border-border/70 bg-muted/40">
          {item.coverUrl ? (
            <Image
              src={item.coverUrl}
              alt={`${item.title} property photo`}
              width={480}
              height={160}
              className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={10} />
              {item.city}, {item.province}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {item.propertyType}
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold">{formatPrice(item.askingPrice)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.lotArea} sqm</p>
      </Link>

      {item.sellerUsername && (
        <div className="border-t border-border/60 px-4 py-2">
          <Link
            href={`/u/${item.sellerUsername}`}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            by {item.sellerName ?? item.sellerUsername}
          </Link>
        </div>
      )}
    </article>
  );
}
