/**
 * @file src/components/MorphingText.tsx
 * @description Smooth morphing text transition component.
 */
import { useEffect, useState } from 'react'

export interface MorphItem {
  text: string
  className?: string
}

export function MorphingText({ items, interval = 3500 }: { items: MorphItem[]; interval?: number }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, interval)
    return () => clearInterval(timer)
  }, [items.length, interval])

  const current = items[index]

  return (
    <div className="relative h-10 w-full overflow-hidden text-center">
      <span
        key={index}
        className={`animate-rise inline-block ${current?.className ?? 'font-mono text-lg font-semibold text-fg'}`}
      >
        {current?.text}
      </span>
    </div>
  )
}
