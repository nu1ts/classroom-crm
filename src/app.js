import { getDB, getCurrentUser } from "./services/storage.js";
import { router } from "./router.js";
import { navigate } from "./services/navigation.js";

document.addEventListener("click", (e) => {
  if (
    e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  )
    return;
  const link = e.target.closest('a[href^="/"]');
  if (!link) return;
  e.preventDefault();
  navigate(link.getAttribute("href"));
});

getDB();

document.addEventListener("focusout", (e) => {
  const el = e.target;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
    const type = el.type;
    if (
      type !== "file" &&
      type !== "checkbox" &&
      type !== "radio" &&
      type !== "button" &&
      type !== "submit"
    ) {
      if (typeof el.value === "string" && el.value !== el.value.trim()) {
        el.value = el.value.trim();
      }
    }
  }
});

document.addEventListener(
  "submit",
  (e) => {
    const form = e.target;
    if (form && form.elements) {
      Array.from(form.elements).forEach((el) => {
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
          const type = el.type;
          if (
            type !== "file" &&
            type !== "checkbox" &&
            type !== "radio" &&
            type !== "button" &&
            type !== "submit"
          ) {
            if (typeof el.value === "string" && el.value !== el.value.trim()) {
              el.value = el.value.trim();
            }
          }
        }
      });
    }
  },
  true,
);

document.addEventListener("DOMContentLoaded", () => {
  router.init();
});
