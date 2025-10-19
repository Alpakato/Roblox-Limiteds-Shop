// app/lib/flyToCart.ts
export function flyToCart(sourceEl: HTMLElement, targetEl: HTMLElement) {
  const s = sourceEl.getBoundingClientRect()
  const t = targetEl.getBoundingClientRect()

  const ghost = sourceEl.cloneNode(true) as HTMLElement
  ghost.style.position = 'fixed'
  ghost.style.left = `${s.left}px`
  ghost.style.top = `${s.top}px`
  ghost.style.width = `${s.width}px`
  ghost.style.height = `${s.height}px`
  ghost.style.pointerEvents = 'none'
  ghost.style.zIndex = '9999'
  ghost.style.borderRadius = '12px'
  ghost.style.overflow = 'hidden'
  ghost.style.transform = 'translate3d(0,0,0)'
  ghost.style.transition = 'transform 500ms cubic-bezier(.2,.8,.2,1), opacity 500ms ease'
  document.body.appendChild(ghost)

  const dx = t.left + t.width / 2 - (s.left + s.width / 2)
  const dy = t.top + t.height / 2 - (s.top + s.height / 2)

  // เริ่มบิน + ย่อขนาด + เฟด
  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.25)`
    ghost.style.opacity = '0.5'
  })

  // ลบตัวปลอมเมื่อจบ
  setTimeout(() => {
    ghost.remove()
  }, 550)
}

// ยิงอีเวนต์กลางให้ Header รู้ว่า "มีของถูกเพิ่ม"
export function emitCartAdd(payload: { sourceEl: HTMLElement | null }) {
  if (!payload.sourceEl) return
  const evt = new CustomEvent('cart:add', { detail: payload })
  document.dispatchEvent(evt)
}
