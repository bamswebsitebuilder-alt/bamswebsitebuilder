
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const drawer = document.querySelector(".left-sidebar");
  const overlay = document.querySelector(".drawer-overlay");
  const menuBtn = document.querySelector(".mobile-menu-btn");
  const postForm = document.querySelector(".composer");
  const postText = document.querySelector("#postText");
  const feed = document.querySelector("#feed");

  const openDrawer = () => {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
    body.classList.add("menu-open");
  };
  const closeDrawer = () => {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
    body.classList.remove("menu-open");
  };

  menuBtn?.addEventListener("click", openDrawer);
  overlay?.addEventListener("click", closeDrawer);
  drawer?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeDrawer));

  document.querySelectorAll(".like-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("liked");
      const countEl = btn.closest(".post")?.querySelector(".like-count");
      if (!countEl) return;
      let count = Number(countEl.dataset.count || "0");
      count += btn.classList.contains("liked") ? 1 : -1;
      countEl.dataset.count = String(count);
      countEl.textContent = `${count} ${countEl.dataset.label}`;
      btn.innerHTML = btn.classList.contains("liked")
        ? `♥ ${btn.dataset.likedText}`
        : `♡ ${btn.dataset.likeText}`;
    });
  });

  document.querySelectorAll(".comment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const comments = btn.closest(".post")?.querySelector(".comments");
      comments?.classList.toggle("open");
    });
  });

  document.querySelectorAll(".follow-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("following");
      btn.textContent = btn.classList.contains("following")
        ? btn.dataset.following
        : btn.dataset.follow;
    });
  });

  postForm?.addEventListener("submit", event => {
    event.preventDefault();
    const text = postText?.value.trim();
    if (!text || !feed) return;

    const lang = document.documentElement.lang === "es" ? "es" : "en";
    const copy = lang === "es"
      ? { now: "Ahora mismo", like: "Me gusta", liked: "Te gusta", comment: "Comentar", share: "Compartir", likes: "Me gusta", comments: "comentarios", placeholder: "Escribe un comentario…" }
      : { now: "Just now", like: "Like", liked: "Liked", comment: "Comment", share: "Share", likes: "likes", comments: "comments", placeholder: "Write a comment…" };

    const article = document.createElement("article");
    article.className = "post card";
    article.innerHTML = `
      <div class="post-head">
        <div class="user-row">
          <div class="post-avatar">BM</div>
          <div><h3>Braion Moreland</h3><p>${copy.now} · 🌎</p></div>
        </div>
        <button class="more-btn" aria-label="More">•••</button>
      </div>
      <p class="post-copy"></p>
      <div class="post-meta">
        <span class="like-count" data-count="0" data-label="${copy.likes}">0 ${copy.likes}</span>
        <span>0 ${copy.comments}</span>
      </div>
      <div class="post-actions">
        <button class="action-btn like-btn" data-like-text="${copy.like}" data-liked-text="${copy.liked}">♡ ${copy.like}</button>
        <button class="action-btn comment-btn">💬 ${copy.comment}</button>
        <button class="action-btn">↗ ${copy.share}</button>
      </div>
      <div class="comments">
        <div class="comment-box"><input type="text" placeholder="${copy.placeholder}"></div>
      </div>`;
    article.querySelector(".post-copy").textContent = text;
    feed.prepend(article);
    postText.value = "";

    const newLike = article.querySelector(".like-btn");
    newLike.addEventListener("click", () => {
      newLike.classList.toggle("liked");
      const countEl = article.querySelector(".like-count");
      let count = Number(countEl.dataset.count || "0");
      count += newLike.classList.contains("liked") ? 1 : -1;
      countEl.dataset.count = String(count);
      countEl.textContent = `${count} ${countEl.dataset.label}`;
      newLike.innerHTML = newLike.classList.contains("liked")
        ? `♥ ${newLike.dataset.likedText}`
        : `♡ ${newLike.dataset.likeText}`;
    });
    article.querySelector(".comment-btn").addEventListener("click", () => {
      article.querySelector(".comments").classList.toggle("open");
    });
  });

  document.querySelectorAll(".side-link, .mobile-nav a").forEach(link => {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      document.querySelectorAll(`a[href="${href}"]`).forEach(a => a.classList.add("active"));
    });
  });
});
