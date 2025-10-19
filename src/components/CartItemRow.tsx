'use client'

import { CartLine, useCart } from '@/app/context/CartContext'

export default function CartItemRow({ line }: { line: CartLine }) {
  const { setQty, remove } = useCart()

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-16 w-16 overflow-hidden rounded-lg ring-1 ring-white/10 bg-black/30">

        <img src={line.image} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white/90">{line.title}</div>
        <div className="text-xs text-white/60">
          {formatPrice(line.price)} × {line.qty}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="rounded-md bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
          onClick={() => setQty(line.id, Math.max(1, line.qty - 1))}
        >
          –
        </button>
        <div className="w-8 text-center text-sm">{line.qty}</div>
        <button
          className="rounded-md bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
          onClick={() => setQty(line.id, line.qty + 1)}
        >
          +
        </button>
      </div>

      <div className="w-20 text-right font-semibold">
        {formatPrice(line.price * line.qty)}
      </div>

      <button
        className="ml-2 rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
        onClick={() => remove(line.id)}
      >
        ลบ
      </button>
    </div>
  )
}

function formatPrice(n: number) {
  try {
    return n.toLocaleString('th-TH', { minimumFractionDigits: 0 })
  } catch {
    return String(n)
  }
}
