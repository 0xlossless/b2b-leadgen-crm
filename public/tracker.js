(function() {
  var ENDPOINT = "https://b2b-leadgen-kappa.vercel.app/api/track";
  var sid = sessionStorage.getItem("_gs_sid");
  if (!sid) {
    sid = Math.random().toString(36).substr(2) + Date.now().toString(36);
    sessionStorage.setItem("_gs_sid", sid);
  }

  var startTime = Date.now();
  var pageCount = parseInt(sessionStorage.getItem("_gs_pc") || "0") + 1;
  sessionStorage.setItem("_gs_pc", pageCount.toString());

  // Get UTM params
  var params = new URLSearchParams(window.location.search);

  // Send page view
  var data = {
    sessionId: sid,
    pagePath: window.location.pathname,
    pageTitle: document.title,
    referrer: document.referrer || null,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign")
  };

  // Use sendBeacon for reliability, fallback to fetch
  function send(payload) {
    var json = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([json], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", body: json, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  }

  send(data);

  // Track duration and bounce on page unload
  var sent = false;
  function onLeave() {
    if (sent) return;
    sent = true;
    var duration = Math.round((Date.now() - startTime) / 1000);
    send({
      sessionId: sid,
      pagePath: window.location.pathname,
      durationSeconds: duration,
      isBounce: pageCount <= 1
    });
  }

  // Use visibilitychange + pagehide for maximum coverage
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "hidden") onLeave();
  });
  window.addEventListener("pagehide", onLeave);
})();
