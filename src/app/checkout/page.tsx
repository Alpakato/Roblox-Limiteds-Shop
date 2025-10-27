// app/checkout/page.tsx
import CheckoutClient from './CheckoutClient'

export default function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const price = Number(Array.isArray(searchParams.price) ? searchParams.price[0] : searchParams.price || '0')
  const qty = parseInt(String(Array.isArray(searchParams.qty) ? searchParams.qty[0] : (searchParams.qty ?? '1')), 10)
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1
  const amount = Math.max(0, Math.round((price * safeQty) * 100) / 100)

  return <CheckoutClient amount={amount} rawParams={searchParams} />
}
