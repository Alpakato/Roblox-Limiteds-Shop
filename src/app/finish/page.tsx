// app/finish/page.tsx
import FinishReceiptClient from '@/components/FinishReceiptClient'

export default function FinishPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  return <FinishReceiptClient rawParams={searchParams ?? {}} />
}
