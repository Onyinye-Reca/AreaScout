import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const money = z.number().int().min(0);

/** Field shapes with no defaults, so a partial update never overwrites what it doesn't mention. */
const fields = {
  title: z.string().trim().min(1),
  description: z.string().trim(),
  address: z.string().trim().min(1),
  property_type: z.string().trim().min(1),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  rent: money,
  agency_fee: money,
  legal_fee: money,
  caution_deposit: money,
  service_charge: money,
  utilities: money,
  features: z.array(z.string()),
  photos: z.array(z.url({ protocol: /^https?$/ })).max(20),
};

/** Either an existing area's slug, or a city plus neighbourhood (created if it's new). */
const place = { area: z.string().trim().min(1).optional(), city: z.string().trim().min(1).optional(), neighbourhood: z.string().trim().min(1).optional() };
const hasPlace = (v: { area?: string; city?: string; neighbourhood?: string }) => !!v.area || (!!v.city && !!v.neighbourhood);
const placeError = { message: 'Choose a city and neighbourhood', path: ['neighbourhood'] };

const createListingSchema = z
  .object({
    ...fields,
    description: fields.description.default(''),
    bedrooms: fields.bedrooms.default(0),
    bathrooms: fields.bathrooms.default(0),
    agency_fee: fields.agency_fee.default(0),
    legal_fee: fields.legal_fee.default(0),
    caution_deposit: fields.caution_deposit.default(0),
    service_charge: fields.service_charge.default(0),
    utilities: fields.utilities.default(0),
    features: fields.features.default([]),
    photos: fields.photos.default([]),
    ...place,
    rent_period: z.string().default('year'),
    /** Save without submitting for review; drafts may be incomplete. */
    draft: z.boolean().default(false),
  })
  .strict()
  .refine(hasPlace, placeError);

/**
 * Owners may change any listing field. Unless the result is kept as a draft
 * (`draft: true`, only for listings that are already drafts), the edit re-enters review.
 */
const updateListingSchema = z
  .object({ ...fields, ...place, draft: z.boolean() })
  .partial()
  .strict();

const adminListingSchema = z.object({ status: z.enum(['live', 'rejected', 'removed']) }).strict();

const searchListingsSchema = z.object({
  area: z.string().optional(),
  city: z.string().trim().optional(),
  type: z.string().optional(),
  beds: z.coerce.number().int().min(0).optional(),
  min_rent: z.coerce.number().int().min(0).optional(),
  max_rent: z.coerce.number().int().min(0).optional(),
  verified: z.enum(['0', '1', 'true', 'false']).optional(),
  q: z.string().trim().optional(),
});

export class CreateListingDto extends createZodDto(createListingSchema) {}
export class UpdateListingDto extends createZodDto(updateListingSchema) {}
export class AdminListingDto extends createZodDto(adminListingSchema) {}
export class SearchListingsDto extends createZodDto(searchListingsSchema) {}
