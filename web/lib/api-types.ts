import { z } from "zod";

export const HallCapacitySchema = z.object({
  name: z.string(),
  capacity_count: z.coerce.number().int().nonnegative().catch(0),
  patronflow: z.coerce.number().int().catch(0),
  total: z.coerce.number().int().catch(0),
  error: z.string().optional(),
});

export const ExternalApiResponseSchema = z.object({
  capacity: z.array(HallCapacitySchema),
});

export const CleanCapacityDataSchema = z.object({
  name: z.string(),
  current_capacity: z.number(),
  total_capacity: z.number(),
  patron_flow: z.number(),
  is_error: z.boolean(),
});

export const CapacityApiResponseSchema = z.object({
  data: z.array(CleanCapacityDataSchema),
  last_updated: z.string().datetime(),
});

export type HallCapacity = z.infer<typeof HallCapacitySchema>;
export type CleanCapacityData = z.infer<typeof CleanCapacityDataSchema>;
export type CapacityApiResponse = z.infer<typeof CapacityApiResponseSchema>;
