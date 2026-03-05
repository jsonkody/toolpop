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

function unwrap(val: any): string {
  if (typeof val === "function") {
    return unwrap(val());
  }
  if (typeof val === "object" && val !== null && "value" in val) {
    return unwrap(val.value);
  }
  return String(val ?? "");
}

type ElWithPopover = HTMLElement & {
  _popover?: HTMLDivElement;
  _binding?: DirectiveBinding;
  _hide_timeout?: number;
  _auto_update_cleanup?: () => void;
  _remove_event_listeners?: () => void;
  _create_popover?: () => void;
};

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

const compute_position = (
  el: ElWithPopover,
  popover: HTMLDivElement | undefined,
  placement: Placement,
) => {
  if (!popover) return;
  computePosition(el, popover, {
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  }).then(({ x, y, placement: new_placement }) => {
    popover.style.top = `${y}px`;
    popover.style.left = `${x}px`;
    popover.style.transformOrigin = get_transform_origin(new_placement);
  });
};

export function createPop(
  global_options?: Partial<PopOptions>,
): ObjectDirective {
  const final_options: PopOptions = { ...default_options, ...global_options };

  return {
    mounted(el: ElWithPopover, binding: DirectiveBinding) {
      const placement = (binding.arg || "top") as Placement;
      const { click, leave, html } = binding.modifiers;
      el._binding = binding;

      const create_popover = () => {
        if (el._popover) return;
        const content = unwrap(el._binding?.value);

        // Povolíme vytvoření prázdného HTML divu, aby mohl sedět v DOMu
        if (!content.trim() && !html) return;

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

        if (html) compute_position(el, popover, placement);
      };

      el._create_popover = create_popover;
      if (html) create_popover();

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
        const popover = el._popover!;

        if (html) popover.innerHTML = content;
        else popover.textContent = content;

        popover.style.display = "inline-block";
        compute_position(el, popover, placement);

        el._auto_update_cleanup = autoUpdate(el, popover, () => {
          compute_position(el, popover, placement);
        });

        requestAnimationFrame(() => {
          popover.style.opacity = "1";
          popover.style.transform = "scale(1)";
        });
      };

      const hide_popover = () => {
        if (!el._popover || el._hide_timeout) return;
        const popover = el._popover;

        popover.style.opacity = "0";
        popover.style.transform = `scale(${final_options.scaleStart})`;

        if (el._auto_update_cleanup) {
          el._auto_update_cleanup();
          el._auto_update_cleanup = undefined;
        }

        el._hide_timeout = window.setTimeout(() => {
          if (html) {
            popover.style.display = "none";
          } else {
            popover.remove();
            el._popover = undefined;
          }
          el._hide_timeout = undefined;
        }, final_options.duration * 1000);
      };

      const click_handler = () => {
        if (el._popover && el._popover.style.opacity === "1") hide_popover();
        else show_popover();
      };

      if (!click) el.addEventListener("mouseenter", show_popover);
      else el.addEventListener("click", click_handler);
      if (!click || leave) el.addEventListener("mouseleave", hide_popover);

      el._remove_event_listeners = () => {
        el.removeEventListener("mouseenter", show_popover);
        el.removeEventListener("mouseleave", hide_popover);
        el.removeEventListener("click", click_handler);
      };
    },

    updated(el: ElWithPopover, binding: DirectiveBinding) {
      el._binding = binding;
      const { html, click } = binding.modifiers;
      const content = unwrap(binding.value);
      const is_empty = !content.trim();

      if (el._popover) {
        if (is_empty) {
          if (el._auto_update_cleanup) {
            el._auto_update_cleanup();
            el._auto_update_cleanup = undefined;
          }
          if (html) {
            el._popover.style.display = "none";
            el._popover.style.opacity = "0";
          } else {
            el._popover.remove();
            el._popover = undefined;
          }
        } else {
          if (html) el._popover.innerHTML = content;
          else el._popover.textContent = content;

          if (
            el._popover.style.display === "none" &&
            !click &&
            el.matches(":hover")
          ) {
            el.dispatchEvent(new Event("mouseenter"));
          }
        }
      } else if (!is_empty) {
        if (html && el._create_popover) el._create_popover();

        if (!click && el.matches(":hover")) {
          el.dispatchEvent(new Event("mouseenter"));
        }
      }
    },

    beforeUnmount(el: ElWithPopover) {
      el._remove_event_listeners?.();
      if (el._auto_update_cleanup) el._auto_update_cleanup();
      if (el._hide_timeout) clearTimeout(el._hide_timeout);
      if (el._popover) {
        el._popover.remove();
        el._popover = undefined;
      }
    },
  };
}
