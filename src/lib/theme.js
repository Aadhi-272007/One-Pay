export const THEMES = ["light", "dark", "system"];

export function applySavedTheme() {
  const saved = localStorage.getItem("onepay-theme") || "light";
  applyTheme(saved);
}

export function applyTheme(theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(theme) {
  localStorage.setItem("onepay-theme", theme);
  applyTheme(theme);
}

export function getTheme() {
  return localStorage.getItem("onepay-theme") || "light";
}