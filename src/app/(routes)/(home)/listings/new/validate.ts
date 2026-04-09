import { z } from "zod";

export const propertyTypes = ["Lot / Land", "House & Lot", "Condo unit", "Commercial", "Farm lot"] as const;
export const titleTypes = ["TCT (Transfer Certificate)", "OCT (Original)", "CCT (Condo)", "Tax declaration only"] as const;
export const encumbranceOptions = ["None", "Mortgage", "Lien", "Annotation", "SPA involved"] as const;
export const utilityOptions = ["Road access", "Electricity", "Water", "Telecom / fiber", "Drainage", "Right of way", "Large trees (DENR permit)"] as const;

export const ListingSchema = z.object({
  propertyType: z.enum(propertyTypes),
  title: z.string().min(10, "Title must be at least 10 characters"),
  askingPrice: z.string().min(1, "Asking price is required"),
  lotArea: z.string().min(1, "Lot area is required"),
  floorArea: z.string().optional(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  titleType: z.enum(titleTypes),
  titleNumber: z.string().optional(),
  registryOfDeeds: z.string().optional(),
  lotNumber: z.string().optional(),
  encumbrances: z.array(z.string()),   // ← no .default()
  utilities: z.array(z.string()),      // ← no .default()
});

export type ListingValues = z.infer<typeof ListingSchema>;