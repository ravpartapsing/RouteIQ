import { z } from 'zod';

export const Features = z.object({ maps: z.boolean(), routing: z.boolean(), mapMatching: z.boolean() });
export type Features = z.infer<typeof Features>;

export const TenantResponse = z.object({
  id: z.string(),
  name: z.string(),
  carrierCode: z.string(),
  dotNumber: z.string().nullable(),
  /** What this carrier actually gets: platform switches with the carrier's own overrides applied. */
  features: Features,
  /** Only what the carrier has set. Unset means "follow the platform". */
  featureOverrides: Features.partial(),
  createdAt: z.string(),
});
export type TenantResponse = z.infer<typeof TenantResponse>;

export const UpdateFeaturesRequest = z
  .object({ maps: z.boolean().nullable(), routing: z.boolean().nullable(), mapMatching: z.boolean().nullable() })
  .partial();
export type UpdateFeaturesRequest = z.infer<typeof UpdateFeaturesRequest>;

export const ClientConfigResponse = z.object({
  features: Features,
  map: z.object({ styleUrl: z.string(), attribution: z.string() }).nullable(),
});
export type ClientConfigResponse = z.infer<typeof ClientConfigResponse>;
