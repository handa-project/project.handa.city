// HAnDA: <head> で最初の表示より前に動かすスクリプト（components/Layout.astro から読み込む）。
// HTML に直接書く（インライン）と、プレビュー環境（Cloudflare Pages）の
// Content-Security-Policy で止められるため、別ファイルにしている。

// 1. マウスで操作する環境では、ブラウザのスクロールバーを隠して
//    白いパネルの右端に自前のスクロールバーを出す（components/PanelScrollbar.astro）。
//    最初の表示より前に決めて、ページが横にずれないようにする
(function () {
  var root = document.documentElement;
  var on = function () { root.classList.add("has-panel-scroll"); };
  var mq = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (mq.matches) return on();
  // 開いた瞬間には判定できないことがある（裏のタブで開いたときなど）ので、
  // あとから「マウスがある」と分かった時点でも切り替える
  if (mq.addEventListener) mq.addEventListener("change", function () { if (mq.matches) on(); });
  var onMove = function (e) {
    if (e.pointerType !== "mouse") return;
    window.removeEventListener("pointermove", onMove);
    on();
  };
  window.addEventListener("pointermove", onMove, { passive: true });
})();

// 2. 画面遷移の向き。メニューで右のページへ進むときは中身が右から、
//    左（ホーム側）へ戻るときは左から入ってくる
(function () {
  function home() {
    var b = document.querySelector(".site-brand");
    return new URL(b ? b.href : "/", location.href).pathname;
  }
  // そのページがメニューの何番目の区画か（ホームは -1、どれでもなければ null）
  function section(path) {
    if (path === home()) return -1;
    var best = null, len = -1;
    document.querySelectorAll(".site-nav a").forEach(function (a, i) {
      var p = new URL(a.href, location.href).pathname.replace(/\/$/, "");
      if (!p) return;
      if ((path === p || path.indexOf(p + "/") === 0) && p.length > len) {
        best = i;
        len = p.length;
      }
    });
    return best;
  }
  function depth(p) {
    return p.split("/").filter(Boolean).length;
  }
  function direction(from, to) {
    var a = new URL(from).pathname, b = new URL(to).pathname;
    if (a === b) return null;
    var i = section(a), j = section(b);
    if (i !== null && j !== null && i !== j) return j > i ? "forward" : "backward";
    if (depth(a) !== depth(b)) return depth(b) > depth(a) ? "forward" : "backward";
    return null;
  }
  function addType(vt, d) {
    if (vt && d && vt.types && vt.types.add) vt.types.add(d);
  }
  // 前のページ側。離れる直前に vt-old を付けて、中身の名前を「前のページ用」に変える
  window.addEventListener("pageswap", function (e) {
    if (!e.viewTransition) return;
    // 再読み込みでは画面遷移の動きをしない（同じ画面どうしを重ねて切り替えるので、メニューバーなどが一瞬薄くなって見えるため）
    if (e.activation && e.activation.navigationType === "reload") return e.viewTransition.skipTransition();
    document.documentElement.classList.add("vt-old");
    var to = e.activation && e.activation.entry && e.activation.entry.url;
    if (to) addType(e.viewTransition, direction(location.href, to));
  });
  // 「戻る」でキャッシュから復元されたときは元に戻す
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) document.documentElement.classList.remove("vt-old");
  });
  // 次のページ側
  window.addEventListener("pagereveal", function (e) {
    var act = window.navigation && navigation.activation;
    var from = act && act.from && act.from.url;
    if (act && act.navigationType === "reload") {
      if (e.viewTransition) e.viewTransition.skipTransition();
      return;
    }
    if (!from) return;
    if (new URL(from).origin !== location.origin) return;
    addType(e.viewTransition, direction(from, location.href));
    var html = document.documentElement;
    var arrive = function () {
      html.classList.remove("vt-wait");
      html.classList.add("is-arriving");
      setTimeout(function () { html.classList.remove("is-arriving"); }, 800);
    };
    if (!e.viewTransition) return arrive();
    // 画面に見えている写真が読み込み終わるまで、次の中身を出さずに待つ
    // （写真が後からパッと出てちらつくのを防ぐ）。長くても WAIT_MAX ミリ秒で出す
    var WAIT_MAX = 700;
    html.classList.add("vt-wait");
    var done = false;
    var go = function () { if (!done) { done = true; arrive(); } };
    setTimeout(go, WAIT_MAX);
    var check = function () {
      var imgs = [].slice.call(document.querySelectorAll(".site-main img")).filter(function (img) {
        var r = img.getBoundingClientRect();
        if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return false;
        return getComputedStyle(img).opacity !== "0"; // 裏で待機中のスライドは除く
      });
      Promise.all(imgs.map(function (img) {
        if (img.complete) return img.decode ? img.decode().catch(function () {}) : null;
        return new Promise(function (ok) {
          img.addEventListener("load", ok, { once: true });
          img.addEventListener("error", ok, { once: true });
        });
      })).then(go);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check);
    else check();
  });
})();
