// Keep initials visible until a saved image has actually loaded. Try every
// available source so an expired legacy URL cannot hide a working auth photo.
const renders = new WeakMap();

export const renderProfileAvatar = (target, sources, displayName = "A") => {
  if (!target) return;
  const render = {};
  renders.set(target, render);
  target.classList.remove("has-photo");
  target.textContent = (displayName.trim() || "A").charAt(0).toUpperCase();
  const candidates = [...new Set(sources.filter(source =>
    typeof source === "string" && source.trim()
  ).map(source => source.trim()))];

  const tryNext = () => {
    if (renders.get(target) !== render || !candidates.length) return;
    const image = document.createElement("img");
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      if (renders.get(target) !== render) return;
      target.replaceChildren(image);
      target.classList.add("has-photo");
    };
    image.onerror = tryNext;
    image.src = candidates.shift();
  };
  tryNext();
};
