import {
  computePosition,
  type Placement,
  autoUpdate,
  flip,
  shift,
  offset,
} from "@floating-ui/dom";
import type { DirectiveBinding, ObjectDirective } from "vue";

export interface PopOptions {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  duration: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  scaleStart: number;
  blur: number;
}

const default_options: PopOptions = {
  fontSize: 14,
  paddingX: 8,
  paddingY: 0,
  duration: 0.15,
  fontFamily: "system-ui, sans-serif",
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  borderColor: "rgba(255, 255, 255, 0.28)",
  borderRadius: 6,
  scaleStart: 0.75,
  blur: 14,
};

type ElWithPopover = HTMLElement & {
  _popover?: HTMLDivElement;
  _binding?: DirectiveBinding;
  _placement?: Placement;
  _hide_timeout?: number;
  _auto_update_cleanup?: () => void;
  _remove_event_listeners?: () => void;
  _create_popover?: () => void;
  _show_popover?: () => void;
  _hide_popover?: () => void;
  _is_visible?: boolean;
};

let active_el: ElWithPopover | undefined;
let document_listeners_active = false;

function unwrap(val: any): string {
  if (typeof val === "function") {
    return unwrap(val());
  }

  if (typeof val === "object" && val !== null && "value" in val) {
    return unwrap(val.value);
  }

  return String(val ?? "");
}

function can_hover(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia) return false;

  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function get_transform_origin(placement: string): string {
  const [side, align] = placement.split("-");

  let origin_x = "center";
  let origin_y = "center";

  if (side === "top") origin_y = "bottom";
  if (side === "bottom") origin_y = "top";
  if (side === "left") origin_x = "right";
  if (side === "right") origin_x = "left";

  if (align === "start") {
    if (side === "top" || side === "bottom") origin_x = "left";
    else origin_y = "top";
  } else if (align === "end") {
    if (side === "top" || side === "bottom") origin_x = "right";
    else origin_y = "bottom";
  }

  return `${origin_y} ${origin_x}`.trim();
}

function compute_position(
  el: ElWithPopover,
  popover: HTMLDivElement | undefined,
  placement: Placement,
): Promise<void> {
  if (!popover) return Promise.resolve();

  return computePosition(el, popover, {
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  }).then(({ x, y, placement: new_placement }) => {
    if (el._popover !== popover) return;

    popover.style.top = `${y}px`;
    popover.style.left = `${x}px`;
    popover.style.transformOrigin = get_transform_origin(new_placement);
  });
}

function handle_document_pointerdown(event: PointerEvent) {
  if (!active_el) return;

  const target = event.target;
  if (!(target instanceof Node)) return;

  const popover = active_el._popover;

  if (active_el.contains(target)) return;
  if (popover?.contains(target)) return;

  active_el._hide_popover?.();
}

function handle_document_keydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;

  active_el?._hide_popover?.();
}

function ensure_document_listeners() {
  if (document_listeners_active) return;
  if (typeof document === "undefined") return;

  document.addEventListener("pointerdown", handle_document_pointerdown, true);
  document.addEventListener("keydown", handle_document_keydown);

  document_listeners_active = true;
}

function cleanup_document_listeners() {
  if (!document_listeners_active) return;
  if (active_el) return;
  if (typeof document === "undefined") return;

  document.removeEventListener(
    "pointerdown",
    handle_document_pointerdown,
    true,
  );
  document.removeEventListener("keydown", handle_document_keydown);

  document_listeners_active = false;
}

function set_active_el(el: ElWithPopover) {
  if (active_el && active_el !== el) {
    active_el._hide_popover?.();
  }

  active_el = el;
  ensure_document_listeners();
}

function clear_active_el(el: ElWithPopover) {
  if (active_el !== el) return;

  active_el = undefined;
  cleanup_document_listeners();
}

export function createPop(
  global_options?: Partial<PopOptions>,
): ObjectDirective {
  const final_options: PopOptions = { ...default_options, ...global_options };

  return {
    mounted(el: ElWithPopover, binding: DirectiveBinding) {
      el._binding = binding;
      el._placement = (binding.arg || "top") as Placement;

      const { click, touch, outside, html } = binding.modifiers;

      const hover_supported = can_hover();
      const uses_click_trigger = click || (touch && !hover_supported);
      const uses_hover_trigger = !uses_click_trigger && hover_supported;

      const uses_outside_manager =
        uses_click_trigger && (outside || !hover_supported);

      const create_popover = () => {
        if (el._popover) return;

        const content = unwrap(el._binding?.value);

        if (!content.trim() && !html) return;

        const placement = el._placement ?? "top";
        const popover = document.createElement("div");

        if (html) {
          popover.innerHTML = content;
        } else {
          popover.textContent = content;
          popover.style.cssText += `
            font-family: ${final_options.fontFamily};
            background-color: ${final_options.backgroundColor};
            backdrop-filter: blur(${final_options.blur}px);
            color: ${final_options.color};
            border-radius: ${final_options.borderRadius}px;
            border: 1px solid ${final_options.borderColor};
            padding: ${final_options.paddingY}px ${final_options.paddingX}px;
          `;
        }

        popover.style.cssText += `
          transition: opacity ${final_options.duration}s, transform ${final_options.duration}s;
          opacity: 0;
          transform: scale(${final_options.scaleStart});
          transform-origin: ${get_transform_origin(placement)};
          pointer-events: none;
          position: absolute;
          font-size: ${final_options.fontSize}px;
          z-index: 999;
          max-width: 42rem;
          display: none;
          user-select: none;
        `;

        document.body.appendChild(popover);
        el._popover = popover;
      };

      const show_popover = () => {
        const content = unwrap(el._binding?.value);
        if (!content.trim()) return;

        if (el._hide_timeout) {
          clearTimeout(el._hide_timeout);
          el._hide_timeout = undefined;
        }

        if (el._auto_update_cleanup) {
          el._auto_update_cleanup();
          el._auto_update_cleanup = undefined;
        }

        if (!el._popover) create_popover();
        if (!el._popover) return;

        const popover = el._popover;
        const placement = el._placement ?? "top";

        if (html) popover.innerHTML = content;
        else popover.textContent = content;

        popover.style.display = "inline-block";
        el._is_visible = true;

        compute_position(el, popover, placement).then(() => {
          requestAnimationFrame(() => {
            if (el._popover !== popover) return;
            if (!el._is_visible) return;

            popover.style.opacity = "1";
            popover.style.transform = "scale(1)";
          });
        });

        el._auto_update_cleanup = autoUpdate(el, popover, () => {
          compute_position(el, popover, placement);
        });

        if (uses_outside_manager) {
          set_active_el(el);
        }
      };

      const hide_popover = () => {
        clear_active_el(el);

        if (!el._popover || el._hide_timeout) return;

        const popover = el._popover;

        popover.style.opacity = "0";
        popover.style.transform = `scale(${final_options.scaleStart})`;
        el._is_visible = false;

        if (el._auto_update_cleanup) {
          el._auto_update_cleanup();
          el._auto_update_cleanup = undefined;
        }

        el._hide_timeout = window.setTimeout(() => {
          if (html) {
            popover.style.display = "none";
          } else {
            popover.remove();

            if (el._popover === popover) {
              el._popover = undefined;
            }
          }

          el._hide_timeout = undefined;
        }, final_options.duration * 1000);
      };

      const focus_handler = () => {
        if (!el.matches(":focus-visible")) return;

        show_popover();
      };

      const blur_handler = () => {
        hide_popover();
      };

      const toggle_handler = () => {
        if (el._is_visible) hide_popover();
        else show_popover();
      };

      el._create_popover = create_popover;
      el._show_popover = show_popover;
      el._hide_popover = hide_popover;

      if (html) {
        create_popover();
      }

      if (uses_click_trigger) {
        el.addEventListener("click", toggle_handler);

        if (hover_supported && !outside) {
          el.addEventListener("mouseleave", hide_popover);
        }
      } else if (uses_hover_trigger) {
        el.addEventListener("mouseenter", show_popover);
        el.addEventListener("mouseleave", hide_popover);
      }

      if (!uses_click_trigger) {
        el.addEventListener("focus", focus_handler);
        el.addEventListener("blur", blur_handler);
      }

      el._remove_event_listeners = () => {
        el.removeEventListener("click", toggle_handler);
        el.removeEventListener("mouseenter", show_popover);
        el.removeEventListener("mouseleave", hide_popover);
        el.removeEventListener("focus", focus_handler);
        el.removeEventListener("blur", blur_handler);
      };
    },

    updated(el: ElWithPopover, binding: DirectiveBinding) {
      el._binding = binding;
      el._placement = (binding.arg || "top") as Placement;

      const { html, click, touch } = binding.modifiers;
      const content = unwrap(binding.value);
      const is_empty = !content.trim();

      const hover_supported = can_hover();
      const uses_click_trigger = click || (touch && !hover_supported);
      const uses_hover_trigger = !uses_click_trigger && hover_supported;

      if (el._popover) {
        if (is_empty) {
          clear_active_el(el);

          if (el._auto_update_cleanup) {
            el._auto_update_cleanup();
            el._auto_update_cleanup = undefined;
          }

          if (el._hide_timeout) {
            clearTimeout(el._hide_timeout);
            el._hide_timeout = undefined;
          }

          el._is_visible = false;
          el._popover.style.opacity = "0";

          if (html) {
            el._popover.style.display = "none";
          } else {
            el._popover.remove();
            el._popover = undefined;
          }

          return;
        }

        if (html) el._popover.innerHTML = content;
        else el._popover.textContent = content;

        if (el._is_visible) {
          compute_position(el, el._popover, el._placement ?? "top");
        }

        if (
          el._popover.style.display === "none" &&
          uses_hover_trigger &&
          el.matches(":hover")
        ) {
          el._show_popover?.();
        }

        return;
      }

      if (is_empty) return;

      if (html && el._create_popover) {
        el._create_popover();
      }

      if (uses_hover_trigger && el.matches(":hover")) {
        el._show_popover?.();
      }
    },

    beforeUnmount(el: ElWithPopover) {
      el._remove_event_listeners?.();

      clear_active_el(el);

      if (el._auto_update_cleanup) {
        el._auto_update_cleanup();
        el._auto_update_cleanup = undefined;
      }

      if (el._hide_timeout) {
        clearTimeout(el._hide_timeout);
        el._hide_timeout = undefined;
      }

      if (el._popover) {
        el._popover.remove();
        el._popover = undefined;
      }

      el._is_visible = false;
    },
  };
}
