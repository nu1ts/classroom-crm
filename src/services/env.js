const DEBUG_STORAGE_KEY = "__app_debug_token__";
const DEBUG_SECRET_KEY = "tsu_debug";

export function isDevMode() {
  try {
    if (typeof window === "undefined") return false;

    const searchParams = new URLSearchParams(window.location.search);
    if (
      searchParams.get("key") === DEBUG_SECRET_KEY ||
      searchParams.get("debug") === DEBUG_SECRET_KEY
    ) {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(DEBUG_STORAGE_KEY, DEBUG_SECRET_KEY);
      }
      return true;
    }

    if (window.location.search.includes(`key=${DEBUG_SECRET_KEY}`)) {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(DEBUG_STORAGE_KEY, DEBUG_SECRET_KEY);
      }
      return true;
    }

    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(DEBUG_STORAGE_KEY) === DEBUG_SECRET_KEY) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
