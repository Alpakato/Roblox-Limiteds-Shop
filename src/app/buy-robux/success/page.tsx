import BuyRobuxSuccessClient from './SuccessClient'

// บอก Next.js ว่าไฟล์นี้เป็น static ได้ (ไม่มี dynamic data ฝั่ง server)
export const dynamic = 'force-static'

export default function Page() {
  return <BuyRobuxSuccessClient />
}
