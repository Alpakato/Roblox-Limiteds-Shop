// app/checkout/page.tsx
import CheckoutClient from './CheckoutClient'

export default function Page({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined }
}) {
  // ส่ง searchParams ให้ client component เสมอ
  return <CheckoutClient rawParams={searchParams} />
}
