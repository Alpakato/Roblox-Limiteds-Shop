// /types/catalog.ts
import { z } from 'zod'

export const ItemTagEnum = z.enum(['LIMITED', 'UGC'])
export type ItemTag = z.infer<typeof ItemTagEnum>

export const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  by: z.string(),
  tag: ItemTagEnum,
  // เปลี่ยนจาก z.string() เป็น z.coerce.string() เพื่อให้เลข 1245 => "1245"
  price: z.coerce.string().nullable().optional(),
  image: z.string(),

  // ฟิลด์เสริม (ไม่บังคับ)
  currency: z.string().optional(),
  displayPrice: z.string().optional(),
}).passthrough() // เผื่ออนาคตมี key อื่น ๆ จะไม่ error

export type Item = z.infer<typeof ItemSchema>

export const CategorySchema = z.object({
  key: z.string(),
  label: z.string()
})
export type Category = z.infer<typeof CategorySchema>

export const CatalogSchema = z.object({
  categories: z.array(CategorySchema),
  robloxLimiteds: z.array(ItemSchema),
  ugcLimiteds: z.array(ItemSchema)
})
export type Catalog = z.infer<typeof CatalogSchema>
