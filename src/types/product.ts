export type Product = {
  id: string; name: string; price: number; currency: string;
  description: string; image: string; stock: number;
  model?: string; // ✅
}