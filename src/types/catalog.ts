// /types/catalog.ts
import { z } from 'zod'

export const ItemTagEnum = z.enum(['LIMITED', 'UGC'])
export type ItemTag = z.infer<typeof ItemTagEnum>

export const ItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  by: z.string(),
  tag: ItemTagEnum,
  price: z.string().nullable().optional(), // "Free" หรือราคาต่าง ๆ
  image: z.string() // path เช่น "/images/xxx.png"
})
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
