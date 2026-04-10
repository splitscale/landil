"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Check, ChevronLeft, ChevronRight, FileText,
  Globe, ImagePlus, Loader2, Lock, Plus, Save, X,
} from "lucide-react";
import {
  encumbranceOptions,
  ListingSchema,
  ListingValues,
  propertyTypes,
  titleTypes,
  utilityOptions,
} from "@/app/(routes)/(home)/listings/new/validate";
import { useUploadThing } from "@/lib/uploadthing";
import { compressImage } from "@/lib/compress-image";
import { fileHash, getCached, setCached, purgeExpired } from "@/lib/upload-cache";
import { verifyCdnUrl } from "@/lib/verify-cdn-url";
import type { ListingType, ListingPhotoType, ListingDocType } from "@/db/schema/listings";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStatus = "idle" | "compressing" | "uploading" | "done" | "error";

type PhotoEntry = {
  id: string;
  dbId?: string;        // set for DB-persisted photos
  file?: File;          // only for new uploads
  preview: string;
  status: UploadStatus;
  uploadedUrl?: string;
  uploadedKey?: string;
};

type DocVisibility = "public" | "private";

type DocEntry = {
  id: string;
  dbId?: string;        // set for DB-persisted docs
  file?: File;
  name: string;
  size: string;
  visibility: DocVisibility;
  status: UploadStatus;
  uploadedUrl?: string;
  uploadedKey?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Photos", "Property specs", "Documents", "Review"] as const;
const STEP2_FIELDS: (keyof ListingValues)[] = [
  "title", "askingPrice", "lotArea", "city", "province", "description",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const fieldCls =
  "border-input flex w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50 md:text-sm";

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  listing: ListingType;
  photos: ListingPhotoType[];
  docs: ListingDocType[];
};

export default function EditListingForm({ listing, photos: initialPhotos, docs: initialDocs }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { startUpload: uploadPhotos, isUploading: photosUploading } = useUploadThing("listingPhotos");
  const { startUpload: uploadDocs, isUploading: docsUploading } = useUploadThing("listingDocs");

  // Pre-populate photos from DB
  const [photos, setPhotos] = useState<PhotoEntry[]>(() =>
    initialPhotos
      .slice()
      .sort((a, b) => (a.cover ? -1 : b.cover ? 1 : 0))
      .map((p) => ({
        id: p.id,
        dbId: p.id,
        preview: p.url,
        status: "done" as UploadStatus,
        uploadedUrl: p.url,
        uploadedKey: p.key,
      })),
  );

  // Pre-populate docs from DB
  const [docs, setDocs] = useState<DocEntry[]>(() =>
    initialDocs.map((d) => ({
      id: d.id,
      dbId: d.id,
      name: d.name,
      size: "",
      visibility: d.visibility,
      status: "done" as UploadStatus,
      uploadedUrl: d.url,
      uploadedKey: d.key,
    })),
  );

  const form = useForm<ListingValues>({
    resolver: zodResolver(ListingSchema),
    defaultValues: {
      propertyType: listing.propertyType as ListingValues["propertyType"],
      title: listing.title,
      askingPrice: String(listing.askingPrice),
      lotArea: listing.lotArea,
      floorArea: listing.floorArea ?? "",
      city: listing.city,
      province: listing.province,
      description: listing.description,
      titleType: listing.titleType as ListingValues["titleType"],
      titleNumber: listing.titleNumber ?? "",
      registryOfDeeds: listing.registryOfDeeds ?? "",
      lotNumber: listing.lotNumber ?? "",
      encumbrances: listing.encumbrances.length ? listing.encumbrances : ["None"],
      utilities: listing.utilities,
    },
  });

  // ── Photos ─────────────────────────────────────────────────────────────────

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    purgeExpired();

    const incoming = Array.from(files).slice(0, 20 - photos.length);

    const entries: PhotoEntry[] = incoming.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: "compressing" as UploadStatus,
    }));
    setPhotos((prev) => [...prev, ...entries]);

    for (const entry of entries) {
      const hash = fileHash(entry.file!);
      const cached = getCached(hash);

      if (cached) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === entry.id
              ? { ...p, status: "done", uploadedUrl: cached.url, uploadedKey: cached.key }
              : p,
          ),
        );
        continue;
      }

      let compressed: File;
      try {
        compressed = await compressImage(entry.file!);
      } catch {
        setPhotos((prev) =>
          prev.map((p) => p.id === entry.id ? { ...p, status: "error" } : p),
        );
        continue;
      }

      setPhotos((prev) =>
        prev.map((p) => p.id === entry.id ? { ...p, status: "uploading" } : p),
      );

      let uploadedUrl: string;
      let uploadedKey: string;
      try {
        const res = await uploadPhotos([compressed]);
        const item = res?.[0];
        if (!item?.url || !item?.key) throw new Error("No URL returned");
        uploadedUrl = item.url;
        uploadedKey = item.key;
      } catch (e) {
        setPhotos((prev) =>
          prev.map((p) => p.id === entry.id ? { ...p, status: "error" } : p),
        );
        toast.error(`Failed to upload ${entry.file!.name}: ${e instanceof Error ? e.message : "unknown error"}`);
        continue;
      }

      try {
        await verifyCdnUrl(uploadedUrl);
      } catch (e) {
        setPhotos((prev) =>
          prev.map((p) => p.id === entry.id ? { ...p, status: "error" } : p),
        );
        toast.error(`Photo CDN verification failed: ${e instanceof Error ? e.message : "CDN error"}`);
        continue;
      }

      setCached(hash, { key: uploadedKey, url: uploadedUrl, name: entry.file!.name });
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === entry.id
            ? { ...p, status: "done", uploadedUrl, uploadedKey }
            : p,
        ),
      );
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      // Only revoke object URLs (not CDN URLs from existing photos)
      if (target?.file) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  // ── Docs ───────────────────────────────────────────────────────────────────

  const addDocs = async (files: FileList | null) => {
    if (!files) return;
    purgeExpired();

    const incoming = Array.from(files);
    const entries: DocEntry[] = incoming.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: formatBytes(file.size),
      visibility: "private" as DocVisibility,
      status: "uploading" as UploadStatus,
    }));
    setDocs((prev) => [...prev, ...entries]);

    for (const entry of entries) {
      const hash = fileHash(entry.file!);
      const cached = getCached(hash);

      if (cached) {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === entry.id
              ? { ...d, status: "done", uploadedUrl: cached.url, uploadedKey: cached.key }
              : d,
          ),
        );
        continue;
      }

      const fileToUpload = entry.file!.type.startsWith("image/")
        ? await compressImage(entry.file!).catch(() => entry.file!)
        : entry.file!;

      let uploadedUrl: string;
      let uploadedKey: string;
      try {
        const res = await uploadDocs([fileToUpload]);
        const item = res?.[0];
        if (!item?.url || !item?.key) throw new Error("No URL returned");
        uploadedUrl = item.url;
        uploadedKey = item.key;
      } catch (e) {
        setDocs((prev) =>
          prev.map((d) => d.id === entry.id ? { ...d, status: "error" } : d),
        );
        toast.error(`Failed to upload ${entry.file!.name}: ${e instanceof Error ? e.message : "unknown error"}`);
        continue;
      }

      try {
        await verifyCdnUrl(uploadedUrl);
      } catch (e) {
        setDocs((prev) =>
          prev.map((d) => d.id === entry.id ? { ...d, status: "error" } : d),
        );
        toast.error(`Doc CDN verification failed: ${e instanceof Error ? e.message : "CDN error"}`);
        continue;
      }

      setCached(hash, { key: uploadedKey, url: uploadedUrl, name: entry.file!.name });
      setDocs((prev) =>
        prev.map((d) =>
          d.id === entry.id
            ? { ...d, status: "done", uploadedUrl, uploadedKey }
            : d,
        ),
      );
    }
  };

  const toggleDocVisibility = (id: string) =>
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, visibility: d.visibility === "private" ? "public" : "private" }
          : d,
      ),
    );

  const removeDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  // ── Toggle tag arrays ──────────────────────────────────────────────────────

  const toggleEncumbrance = (value: string) => {
    const current = form.getValues("encumbrances");
    if (value === "None") { form.setValue("encumbrances", ["None"]); return; }
    const without = current.filter((v) => v !== "None");
    const next = without.includes(value) ? without.filter((v) => v !== value) : [...without, value];
    form.setValue("encumbrances", next.length ? next : ["None"]);
  };

  const toggleUtility = (value: string) => {
    const current = form.getValues("utilities");
    form.setValue(
      "utilities",
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (step === 2) await form.trigger(STEP2_FIELDS);
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const isAnyUploading =
    photosUploading ||
    docsUploading ||
    photos.some((p) => p.status === "compressing" || p.status === "uploading") ||
    docs.some((d) => d.status === "uploading");

  const handleSave = async (status: "draft" | "published") => {
    if (isAnyUploading) {
      toast.error("Please wait for uploads to finish.");
      return;
    }

    await form.trigger();
    if (Object.keys(form.formState.errors).length > 0) {
      toast.error("Fix the form errors before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          values: form.getValues(),
          photos: photos
            .filter((p) => p.status === "done")
            .map((p, i) => ({
              dbId: p.dbId,
              url: p.uploadedUrl!,
              key: p.uploadedKey!,
              cover: i === 0,
            })),
          docs: docs
            .filter((d) => d.status === "done")
            .map((d) => ({
              dbId: d.dbId,
              url: d.uploadedUrl!,
              key: d.uploadedKey!,
              name: d.name,
              visibility: d.visibility,
            })),
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Listing saved.");
      router.push(`/listings/${listing.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const pricePerSqm = () => {
    const price = parseFloat(form.watch("askingPrice").replace(/,/g, "") || "0");
    const area = parseFloat(form.watch("lotArea") || "0");
    if (!price || !area) return "";
    return Math.round(price / area).toLocaleString();
  };

  const stepErrors = () => {
    const errors = form.formState.errors;
    const step2Fields: (keyof ListingValues)[] = [
      "title", "askingPrice", "lotArea", "city", "province", "description",
    ];
    return { 2: step2Fields.filter((f) => !!errors[f]).length };
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Stepper */}
      <div className="mb-8 flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          const errCount = stepErrors()[n as keyof ReturnType<typeof stepErrors>] ?? 0;

          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      done && "bg-primary text-primary-foreground",
                      active && "bg-foreground text-background",
                      !done && !active && "border border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check size={12} /> : n}
                  </div>
                  {errCount > 0 && !active && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
                      {errCount}
                    </span>
                  )}
                </div>
                <span className={cn("hidden text-xs sm:block", active ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="mx-3 h-px flex-1 bg-border" />}
            </div>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">

          {/* ── Step 1: Photos ── */}
          {step === 1 && (
            <div className="rounded-xl border border-border p-5">
              <p className="text-sm font-medium">Property photos</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                First photo is the cover. Up to 20.
              </p>

              {photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  <ImagePlus size={16} />
                  Click to add photos
                </button>
              ) : (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {photos.map((p, idx) => (
                    <div
                      key={p.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <img src={p.preview} alt="" className="h-full w-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                          Cover
                        </span>
                      )}
                      {(p.status === "compressing" || p.status === "uploading") && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                          <Loader2 size={14} className="animate-spin text-white" />
                          <span className="text-[9px] text-white">
                            {p.status === "compressing" ? "Compressing…" : "Uploading…"}
                          </span>
                        </div>
                      )}
                      {p.status === "error" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/60">
                          <span className="text-[9px] font-medium text-white">Failed</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-1 top-1 hidden rounded bg-black/60 p-0.5 text-white hover:bg-black/80 group-hover:flex"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 20 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="aspect-square rounded-lg border border-dashed border-border bg-muted/50 flex items-center justify-center transition-colors hover:bg-muted"
                    >
                      <ImagePlus size={18} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
              />
            </div>
          )}

          {/* ── Step 2: Property specs ── */}
          {step === 2 && (
            <>
              <div className="rounded-xl border border-border p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium">Listing basics</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Describe the property you're selling or offering.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Property type</Label>
                  <div className="flex flex-wrap gap-2">
                    {propertyTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => form.setValue("propertyType", type)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          form.watch("propertyType") === type
                            ? "border-foreground bg-foreground text-background hover:bg-foreground/85"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-xs text-muted-foreground">Listing title</Label>
                      <FormControl><Input placeholder="e.g. 300 sqm Titled Lot in Cebu" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="askingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Asking price (PHP)</Label>
                        <FormControl><Input placeholder="3,500,000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Price per sqm</Label>
                    <Input readOnly value={pricePerSqm()} placeholder="Auto-computed" className="bg-muted/50 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="lotArea"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Lot area (sqm)</Label>
                        <FormControl><Input placeholder="300" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floorArea"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Floor area (sqm)</Label>
                        <FormControl><Input placeholder="If applicable" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">City / Municipality</Label>
                        <FormControl><Input placeholder="Consolacion" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Province</Label>
                        <FormControl><Input placeholder="Cebu" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <FormControl>
                        <textarea
                          className={cn(fieldCls, "h-24 resize-none py-2")}
                          placeholder="Location, road access, nearby landmarks, and key features…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-xl border border-border p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium">Title & ownership</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Helps buyers start due diligence immediately.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="titleType"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Title type</Label>
                        <FormControl>
                          <select className={cn(fieldCls, "h-9")} {...field}>
                            {titleTypes.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="titleNumber"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Title number</Label>
                        <FormControl><Input placeholder="e.g. TCT-12345" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="registryOfDeeds"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Registry of Deeds</Label>
                        <FormControl><Input placeholder="e.g. RD Cebu City" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-xs text-muted-foreground">Lot number</Label>
                        <FormControl><Input placeholder="e.g. Lot 4, Block 2" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Known encumbrances</Label>
                  <div className="flex flex-wrap gap-2">
                    {encumbranceOptions.map((opt) => {
                      const selected = form.watch("encumbrances").includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleEncumbrance(opt)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            selected
                              ? "border-foreground bg-foreground text-background hover:bg-foreground/85"
                              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted",
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-5 space-y-3">
                <div>
                  <p className="text-sm font-medium">Utilities & access</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Flag what's available on or near the property.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {utilityOptions.map((opt) => {
                    const selected = form.watch("utilities").includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleUtility(opt)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          selected
                            ? "border-foreground bg-foreground text-background hover:bg-foreground/85"
                            : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Documents ── */}
          {step === 3 && (
            <div className="rounded-xl border border-border p-5 space-y-4">
              <div>
                <p className="text-sm font-medium">Supporting documents</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Control what's visible to the public vs. verified buyers only.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                <FileText size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Private</span> docs are only shared after you approve a buyer's request.{" "}
                  <span className="font-medium text-foreground">Public</span> docs are visible on the listing page.
                </p>
              </div>

              {docs.length > 0 && (
                <div className="divide-y divide-border">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        {doc.status === "uploading" ? (
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                        ) : doc.status === "error" ? (
                          <X size={14} className="text-destructive" />
                        ) : (
                          <FileText size={14} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.status === "uploading"
                            ? "Uploading…"
                            : doc.status === "error"
                              ? "Failed"
                              : doc.dbId
                                ? "Existing"
                                : doc.size}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleDocVisibility(doc.id)}
                        disabled={doc.status !== "done"}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40",
                          doc.visibility === "private"
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900",
                        )}
                      >
                        {doc.visibility === "private" ? <Lock size={10} /> : <Globe size={10} />}
                        {doc.visibility === "private" ? "Private" : "Public"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDoc(doc.id)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <Plus size={14} />
                Add document
              </button>
              <input
                ref={docInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { addDocs(e.target.files); e.target.value = ""; }}
              />
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 4 && (
            <div className="rounded-xl border border-border p-5 space-y-4">
              <p className="text-sm font-medium">Review & save</p>

              <dl className="space-y-2 rounded-lg bg-muted/50 p-4">
                {[
                  ["Type", form.getValues("propertyType")],
                  ["Title", form.getValues("title") || "—"],
                  ["Asking price", form.getValues("askingPrice") ? `₱${form.getValues("askingPrice")}` : "—"],
                  ["Location", [form.getValues("city"), form.getValues("province")].filter(Boolean).join(", ") || "—"],
                  ["Photos", `${photos.filter((p) => p.status === "done").length} total`],
                  ["Documents", `${docs.filter((d) => d.status === "done").length} (${docs.filter((d) => d.status === "done" && d.visibility === "public").length} public)`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="max-w-[55%] text-right text-xs">{value}</dd>
                  </div>
                ))}
              </dl>

              {isAnyUploading && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                  <Loader2 size={13} className="animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Uploads in progress — please wait before saving.</p>
                </div>
              )}

              {!isAnyUploading && Object.keys(form.formState.errors).length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950">
                  <span className="mt-0.5 text-amber-500" aria-hidden>⚠</span>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Some required fields are incomplete. Go back to fix them.
                  </p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  className="w-full"
                  disabled={isSubmitting || isAnyUploading || Object.keys(form.formState.errors).length > 0}
                  onClick={() => handleSave("published")}
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save & publish
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting || isAnyUploading}
                  onClick={() => handleSave("draft")}
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save as draft
                </Button>
              </div>
            </div>
          )}

          {/* ── Footer nav ── */}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 1}>
              <ChevronLeft size={14} />
              Back
            </Button>
            {step < 4 && (
              <Button type="button" onClick={handleNext}>
                Continue
                <ChevronRight size={14} />
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  );
}
