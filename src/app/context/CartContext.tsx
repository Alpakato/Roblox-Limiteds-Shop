'use client'

import { createContext, useContext, useMemo, useReducer, ReactNode } from 'react'

export type CartLine = {
  id: string
  title: string
  image?: string
  price: number   // ราคาต่อชิ้น
  qty: number
}

export type CartState = { lines: CartLine[] }

type Action =
  | { type: 'ADD'; line: CartLine }
  | { type: 'REMOVE'; id: string }
  | { type: 'SETQTY'; id: string; qty: number }
  | { type: 'CLEAR' }

const CartCtx = createContext<{
  state: CartState
  add: (l: CartLine) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  subtotal: number
  count: number
} | null>(null)

function cartReducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD': {
      const i = state.lines.findIndex((x) => x.id === action.line.id)
      if (i >= 0) {
        const next = [...state.lines]
        next[i] = { ...next[i], qty: Math.min(99, next[i].qty + action.line.qty) }
        return { lines: next }
      }
      return { lines: [...state.lines, action.line] }
    }
    case 'REMOVE':
      return { lines: state.lines.filter((x) => x.id !== action.id) }
    case 'SETQTY':
      return {
        lines: state.lines.map((x) =>
          x.id === action.id ? { ...x, qty: Math.max(0, action.qty) } : x
        ),
      }
    case 'CLEAR':
      return { lines: [] }
    default:
      return state
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] })

  const helpers = useMemo(() => {
    const subtotal = state.lines.reduce((s, l) => s + l.price * l.qty, 0)
    const count = state.lines.reduce((s, l) => s + l.qty, 0)
    return {
      state,
      subtotal,
      count,
      add: (l: CartLine) => dispatch({ type: 'ADD', line: l }),
      remove: (id: string) => dispatch({ type: 'REMOVE', id }),
      setQty: (id: string, qty: number) => dispatch({ type: 'SETQTY', id, qty }),
      clear: () => dispatch({ type: 'CLEAR' }),
    }
  }, [state])

  return <CartCtx.Provider value={helpers}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within <CartProvider>')
  return ctx
}
