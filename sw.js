/* 젤리 블록 퀘스트 — Service Worker
 * 전략:
 *  - 설치 시 핵심 자산을 프리캐시 → 완전 오프라인 플레이
 *  - HTML(내비게이션)은 network-first: 온라인이면 항상 최신, 오프라인이면 캐시
 *  - 그 외 동일 출처 자산은 cache-first
 *  - 새 버전 배포 시: CACHE 버전을 올리면 클라이언트에 업데이트 바가 뜬다
 */
const CACHE = "wbq-v3.5.2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  // 효과음(소용량)은 프리캐시 → 오프라인에서도 소리 보장.
  // BGM(6.6MB)·영상(1.8MB)은 첫 재생 시 런타임 캐시(아래 fetch 핸들러의 cache-first).
  "./media/sfx/place.mp3","./media/sfx/clear.mp3","./media/sfx/fanfare.mp3",
  "./media/sfx/click.mp3","./media/sfx/invalid.mp3","./media/sfx/coin.mp3",
  "./media/sfx/booster.mp3","./media/sfx/rotate.mp3","./media/sfx/pickup.mp3",
  "./media/sfx/newpieces.mp3","./media/sfx/gameover.mp3",
  "./media/sfx/helper_appear.mp3","./media/sfx/helper_wink.mp3",
  "./media/sfx/villain_tease.mp3","./media/sfx/villain_flee.mp3",
  "./media/sfx/boss_appear.mp3","./media/sfx/boss_smirk.mp3"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("wbq-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // HTML: 온라인이면 최신, 오프라인이면 캐시
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
    )
  );
});
