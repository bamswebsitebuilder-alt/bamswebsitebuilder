(() => {
  'use strict';

  const LIVECHAT_LICENSE = 19864799;
  const TRACKING_SCRIPT_URL = 'https://cdn.livechatinc.com/tracking.js';
  const CONSENT_KEY = 'bam-cookie-consent-v3';

  const hasFunctionalConsent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CONSENT_KEY));
      return Boolean(saved && saved.decided && saved.functional);
    } catch {
      return false;
    }
  };

  const loadLiveChat = () => {
    if (window.__bamLiveChatLoaded || document.querySelector(`script[src="${TRACKING_SCRIPT_URL}"]`)) return;
    window.__bamLiveChatLoaded = true;

    window.__lc = window.__lc || {};
    window.__lc.license = LIVECHAT_LICENSE;
    window.__lc.integration_name = 'manual_onboarding';
    window.__lc.product_name = 'livechat';

    const callQueue = [];
    const enqueue = (method, args) => {
      if (widget._h) return widget._h.apply(null, [method, Array.from(args)]);
      callQueue.push([method, Array.from(args)]);
      return undefined;
    };

    const widget = window.LiveChatWidget || {
      _q: callQueue,
      _h: null,
      _v: '2.0',
      on() { return enqueue('on', arguments); },
      once() { return enqueue('once', arguments); },
      off() { return enqueue('off', arguments); },
      get() {
        if (!widget._h) throw new Error('[LiveChatWidget] Getters are unavailable before LiveChat loads.');
        return enqueue('get', arguments);
      },
      call() { return enqueue('call', arguments); },
      init() {
        const script = document.createElement('script');
        script.async = true;
        script.src = TRACKING_SCRIPT_URL;
        document.head.appendChild(script);
      }
    };

    window.LiveChatWidget = widget;
    if (!window.__lc.asyncInit) widget.init();
  };

  if (hasFunctionalConsent()) loadLiveChat();

  window.addEventListener('bam:consent-changed', (event) => {
    if (event.detail?.functional) loadLiveChat();
  });
})();