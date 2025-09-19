import {
  computePosition,
  type Placement,
  autoUpdate,
  flip,
  shift,
  offset,
} from '@floating-ui/dom'
import type { DirectiveBinding, ObjectDirective } from 'vue'

export interface PopOptions {
  fontSize: number
  paddingX: number
  paddingY: number
  duration: number
  fontFamily: string
  color: string
  backgroundColor: string
  borderColor: string
  borderRadius: number
  scaleStart: number
  blur: number
}

const defaultOptions: PopOptions = {
  fontSize: 14,
  paddingX: 10,
  paddingY: 0,
  duration: 0.15,
  fontFamily: 'system-ui, sans-serif',
  color: 'white',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderColor: 'rgba(255, 255, 255, 0.28)',
  borderRadius: 6,
  scaleStart: 0.75,
  blur: 14,
}

export type Origin = 'top' | 'bottom' | 'left' | 'right'

const origins: Record<string, Origin> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
}

function unwrap(val: any): string {
  if (typeof val === 'function') {
    return unwrap(val())
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return unwrap(val.value)
  }
  return String(val ?? '')
}

type ElWithPopover = HTMLElement & {
  _popover?: HTMLDivElement
  _binding?: DirectiveBinding
  _hideTimeout?: number
  _autoUpdateCleanup?: () => void
  _removeEventListeners?: () => void
}

export function createPop(
  globalOptions?: Partial<PopOptions>
): ObjectDirective {
  // Sloučíme výchozí hodnoty s těmi od uživatele
  // Uživatelovy hodnoty mají přednost
  const finalOptions: PopOptions = {
    ...defaultOptions,
    ...globalOptions,
  }

  return {
    mounted(el: ElWithPopover, binding: DirectiveBinding) {
      const placement = (binding.arg || 'top') as Placement
      const origin: Origin = origins[placement] || 'top'
      const { click, leave } = binding.modifiers
      el._binding = binding

      const createPopover = () => {
        const popover = document.createElement('div')
        const content = unwrap(el._binding?.value)
        if (!content.trim()) return
        if (el._binding?.modifiers.html) {
          popover.innerHTML = content
        } else {
          popover.textContent = content
          popover.style.cssText += `
            font-family: ${finalOptions.fontFamily};
            background-color: ${finalOptions.backgroundColor};
            backdrop-filter: blur(${finalOptions.blur}px);
            color: ${finalOptions.color};
            border-radius: ${finalOptions.borderRadius}px;
            border: 1px solid ${finalOptions.borderColor};
            padding: ${finalOptions.paddingY} ${finalOptions.paddingX}px;
          `
        }
        popover.style.cssText += `
          transition: opacity ${finalOptions.duration}s, transform ${finalOptions.duration}s;
          opacity: 0;
          transform: scale(${finalOptions.scaleStart});
          transform-origin: ${origin};
          pointer-events: none;
          position: absolute;
          font-size: ${finalOptions.fontSize}px;
          z-index: 999;
          max-width: 42rem;
          display: inline-block;
        `
        document.body.appendChild(popover)
        el._popover = popover
      }

      const showPopover = () => {
        const content = unwrap(el._binding?.value)
        if (!content.trim()) return
        if (el._hideTimeout) clearTimeout(el._hideTimeout)
        if (!el._popover) createPopover()
        const popover = el._popover!
        if (el._binding?.modifiers.html) {
          popover.innerHTML = content
        } else {
          popover.textContent = content
        }

        computePosition(el, popover, {
          placement,
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y, placement }) => {
          popover.style.top = `${y}px`
          popover.style.left = `${x}px`
          popover.style.transformOrigin = origins[placement] || 'top'
        })

        requestAnimationFrame(() => {
          popover.style.opacity = '1'
          popover.style.transform = 'scale(1)'
        })

        el._autoUpdateCleanup = autoUpdate(el, popover, () => {
          computePosition(el, popover, {
            placement,
            middleware: [offset(8), flip(), shift({ padding: 8 })],
          }).then(({ x, y, placement }) => {
            popover.style.top = `${y}px`
            popover.style.left = `${x}px`
            popover.style.transformOrigin = origins[placement] || 'top'
          })
        })
      }

      const hidePopover = () => {
        if (!el._popover) return
        const popover = el._popover
        popover.style.opacity = '0'
        popover.style.transform = `scale(${finalOptions.scaleStart})`
        if (el._autoUpdateCleanup) {
          el._autoUpdateCleanup()
          el._autoUpdateCleanup = undefined
        }
        el._hideTimeout = window.setTimeout(() => {
          popover.remove()
          el._popover = undefined
        }, finalOptions.duration * 1000)
      }

      const clickHandler = () => {
        if (el._popover) {
          hidePopover()
        } else {
          showPopover()
        }
      }

      if (!click) {
        el.addEventListener('mouseenter', showPopover)
      } else {
        el.addEventListener('click', clickHandler)
      }
      if (!click || leave) {
        el.addEventListener('mouseleave', hidePopover)
      }

      el._removeEventListeners = () => {
        el.removeEventListener('mouseenter', showPopover)
        el.removeEventListener('mouseleave', hidePopover)
        el.removeEventListener('click', clickHandler)
      }
    },

    updated(el: ElWithPopover, binding: DirectiveBinding) {
      el._binding = binding
      const content = unwrap(binding.value)
      const isEmpty = !content.trim()

      if (el._popover) {
        if (isEmpty) {
          // nový obsah je prázdný → schovej tooltip
          el._popover.remove()
          el._popover = undefined
          if (el._autoUpdateCleanup) {
            el._autoUpdateCleanup()
            el._autoUpdateCleanup = undefined
          }
        } else {
          // aktualizuj obsah
          if (binding.modifiers.html) {
            el._popover.innerHTML = content
          } else {
            el._popover.textContent = content
          }
        }
      } else if (!isEmpty) {
        // tooltip je skrytý, ale nový obsah není prázdný → zobraz, pokud je kurzor nad elementem
        if (!binding.modifiers.click && el.matches(':hover')) {
          // manuálně zavolej showPopover
          const event = new Event('mouseenter')
          el.dispatchEvent(event)
        }
      }
    },

    beforeUnmount(el: ElWithPopover) {
      el._removeEventListeners?.()
      if (el._popover) {
        el._popover.remove()
        el._popover = undefined
      }
      if (el._hideTimeout) {
        clearTimeout(el._hideTimeout)
      }
    },
  }
}
