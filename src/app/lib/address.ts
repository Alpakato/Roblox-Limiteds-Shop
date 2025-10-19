// src/lib/address.ts
export type SavedAddress = {
  address1: string
  subdistrict?: string
  district?: string
  province?: string
  postcode?: string
  lat: number
  lon: number
  provider: 'nominatim'
  formatted?: string
}

export function getSavedAddress(): SavedAddress | null {
  try {
    const s = localStorage.getItem('userAddress:v1')
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}
