(function () {
  "use strict";

  var STORAGE_KEY = "gta6-unofficial-guide-marks-v1";
  var topic = "money";
  var moneyStage = "all";
  var hiddenKind = "all";
  var query = "";

  var topicSelect = document.getElementById("topic");
  var moneyFilter = document.getElementById("money-filter");
  var moneyFilterWrap = document.getElementById("money-filter-wrap");
  var hiddenFilter = document.getElementById("hidden-filter");
  var hiddenFilterWrap = document.getElementById("hidden-filter-wrap");
  var search = document.getElementById("search");
  var empty = document.getElementById("empty");
  var introMoney = document.getElementById("intro-money");
  var introHidden = document.getElementById("intro-hidden");
  var introMap = document.getElementById("intro-map");
  var checkLink = document.getElementById("check-link");
  var startCh1 = document.getElementById("start-ch1");
  var gotoCh1 = document.getElementById("goto-ch1");

  function marks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveMarks(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* private mode or quota; ignore */
    }
  }

  function applyMarks() {
    var data = marks();
    document.querySelectorAll("[data-mark]").forEach(function (btn) {
      var id = btn.getAttribute("data-mark");
      var on = !!data[id];
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "已標記" : "標記";
    });
  }

  function textOf(el) {
    return (el.getAttribute("data-search") || el.textContent || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function syncChrome() {
    document.querySelectorAll(".tile[data-goto]").forEach(function (tile) {
      tile.setAttribute("aria-pressed", tile.getAttribute("data-goto") === topic ? "true" : "false");
    });
    if (checkLink) {
      checkLink.classList.toggle("is-on", topic === "check");
      checkLink.setAttribute("aria-current", topic === "check" ? "page" : "false");
    }
    if (topicSelect && topicSelect.value !== topic) topicSelect.value = topic;
    if (moneyFilter && moneyFilter.value !== moneyStage) moneyFilter.value = moneyStage;
    if (hiddenFilter && hiddenFilter.value !== hiddenKind) hiddenFilter.value = hiddenKind;
    document.querySelectorAll("#money-filter-wrap .pill[data-stage]").forEach(function (pill) {
      pill.setAttribute("aria-pressed", pill.getAttribute("data-stage") === moneyStage ? "true" : "false");
    });
    document.querySelectorAll("#hidden-filter-wrap .pill[data-kind]").forEach(function (pill) {
      pill.setAttribute("aria-pressed", pill.getAttribute("data-kind") === hiddenKind ? "true" : "false");
    });
  }

  function apply() {
    var q = query.trim().toLowerCase();
    var shown = 0;
    document.querySelectorAll("article.card[data-topic]").forEach(function (card) {
      var t = card.getAttribute("data-topic");
      var stage = card.getAttribute("data-stage") || "";
      var kind = card.getAttribute("data-kind") || "";
      var okTopic = t === topic;
      var okStage = topic !== "money" || moneyStage === "all" || stage === moneyStage;
      var okKind = topic !== "hidden" || hiddenKind === "all" || kind === hiddenKind;
      var okSearch = !q || textOf(card).indexOf(q) !== -1;
      var show = q ? okSearch : okTopic && okStage && okKind;
      card.classList.toggle("hidden", !show);
      if (show) shown += 1;
    });

    var alwaysMap = document.getElementById("map-shortcut");
    if (alwaysMap) {
      /* Dock already has a map launch; show the explanation card on the map topic. */
      alwaysMap.classList.toggle("hidden", topic !== "map" || !!q);
    }

    if (introMoney) introMoney.classList.toggle("hidden", !(topic === "money" && !q));
    if (introHidden) introHidden.classList.toggle("hidden", !(topic === "hidden" && !q));
    if (introMap) introMap.classList.toggle("hidden", !(topic === "map" && !q));
    if (moneyFilterWrap) moneyFilterWrap.hidden = topic !== "money";
    if (hiddenFilterWrap) hiddenFilterWrap.hidden = topic !== "hidden";
    if (empty) empty.hidden = shown > 0;
    if (startCh1) startCh1.classList.toggle("hidden", !(topic === "money" && !q));
    syncChrome();
  }

  function goChapter1() {
    topic = "money";
    moneyStage = "ch1";
    query = "";
    if (search) search.value = "";
    apply();
    if (history.replaceState) {
      history.replaceState(null, "", "#chapter-1");
    } else {
      location.hash = "chapter-1";
    }
    var el = document.getElementById("chapter-1");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
  }

  function applyHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    var params = "";
    try { params = new URLSearchParams(location.search || ""); } catch (e) { params = null; }
    var want = hash === "chapter-1" || (params && params.get("stage") === "ch1");
    if (want) goChapter1();
  }

  function setTopic(next, scrollTo) {
    topic = next;
    apply();
    if (scrollTo) {
      var el = document.getElementById(scrollTo) || document.getElementById("main");
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
    }
  }

  function bindMarks() {
    document.querySelectorAll("[data-mark]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-mark");
        var data = marks();
        if (data[id]) delete data[id];
        else data[id] = true;
        saveMarks(data);
        applyMarks();
      });
    });
  }

  document.querySelectorAll(".tile[data-goto]").forEach(function (tile) {
    tile.addEventListener("click", function () {
      if (search) search.value = "";
      query = "";
      setTopic(tile.getAttribute("data-goto"));
    });
  });

  document.querySelectorAll("#money-filter-wrap .pill[data-stage]").forEach(function (pill) {
    pill.addEventListener("click", function () {
      moneyStage = pill.getAttribute("data-stage");
      apply();
    });
  });

  document.querySelectorAll("#hidden-filter-wrap .pill[data-kind]").forEach(function (pill) {
    pill.addEventListener("click", function () {
      hiddenKind = pill.getAttribute("data-kind");
      apply();
    });
  });

  if (checkLink) {
    checkLink.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (search) search.value = "";
      query = "";
      setTopic("check", "check-scope");
    });
  }

  if (topicSelect) {
    topicSelect.addEventListener("change", function () {
      topic = topicSelect.value;
      apply();
    });
  }
  if (moneyFilter) {
    moneyFilter.addEventListener("change", function () {
      moneyStage = moneyFilter.value;
      apply();
    });
  }
  if (hiddenFilter) {
    hiddenFilter.addEventListener("change", function () {
      hiddenKind = hiddenFilter.value;
      apply();
    });
  }
  if (search) {
    search.addEventListener("input", function () {
      query = search.value || "";
      apply();
    });
  }

  if (gotoCh1) {
    gotoCh1.addEventListener("click", function (ev) {
      ev.preventDefault();
      goChapter1();
    });
  }

  window.addEventListener("hashchange", function () {
    if ((location.hash || "").replace(/^#/, "") === "chapter-1") goChapter1();
  });

  bindMarks();
  applyMarks();
  apply();
  applyHash();
})();
