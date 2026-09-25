import { z } from 'zod';

export const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'nurturing']);

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  role: optionalText(160),
  company: optionalText(200),
  email: z.union([z.string().trim().email().max(320), z.literal(''), z.null()]).optional(),
  industry: optionalText(120),
  status: leadStatusSchema.optional(),
  source: z.string().trim().min(1).max(80).optional(),
  notes: z.string().max(10_000).optional().nullable(),
}).strict();

export const updateLeadSchema = createLeadSchema.partial().strict().refine(
  (input) => Object.keys(input).length > 0,
  { message: 'Provide at least one field to update.' },
);

export const listLeadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export const uuidSchema = z.string().uuid();
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
