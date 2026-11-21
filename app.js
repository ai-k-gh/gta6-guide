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
      var show;
      if (q) {
        show = okSearch;
      } else {
        show = okTopic && okStage && okKind;
      }
      card.classList.toggle("hidden", !show);
      if (show) shown += 1;
    });

    var alwaysMap = document.getElementById("map-shortcut");
    if (alwaysMap) {
      alwaysMap.classList.toggle("hidden", !(!q && (topic === "money" || topic === "tips" || topic === "hidden" || topic === "check")));
      /* keep the shortcut visible on non-map tabs; hide only when already in map or searching */
      if (topic === "map") alwaysMap.classList.add("hidden");
      if (q) alwaysMap.classList.add("hidden");
    }

    if (introMoney) introMoney.classList.toggle("hidden", !(topic === "money" && !q));
    if (introHidden) introHidden.classList.toggle("hidden", !(topic === "hidden" && !q));
    if (introMap) introMap.classList.toggle("hidden", !(topic === "map" && !q));
    if (moneyFilterWrap) moneyFilterWrap.hidden = topic !== "money";
    if (hiddenFilterWrap) hiddenFilterWrap.hidden = topic !== "hidden";
    if (empty) empty.hidden = shown > 0;
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

  bindMarks();
  applyMarks();
  apply();
})();
