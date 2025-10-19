// app/checkout/page.tsx
import CheckoutClient from './CheckoutClient'

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // ดึง amount จาก query แล้วแปลงเป็น number ให้เรียบร้อย
  const amountParam =
    typeof searchParams.amount === 'string' ? searchParams.amount : '0.00'
  const amount = Math.max(0, Number(amountParam) || 0)

  // ส่งเป็น props เข้า Client component (เลิกใช้ useSearchParams)
  return <CheckoutClient amount={amount} rawParams={searchParams} />
}
