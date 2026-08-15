(() => {
  'use strict';

  const LIVECHAT_LICENSE = 19864799;
  const TRACKING_SCRIPT_URL = 'https://cdn.livechatinc.com/tracking.js';

  if (window.LiveChatWidget || document.querySelector(`script[src="${TRACKING_SCRIPT_URL}"]`)) {
    return;
  }

  window.__lc = window.__lc || {};
  window.__lc.license = LIVECHAT_LICENSE;
  window.__lc.integration_name = 'manual_onboarding';
  window.__lc.product_name = 'livechat';

  const callQueue = [];
  const enqueue = (method, args) => {
    if (widget._h) {
      return widget._h.apply(null, [method, Array.from(args)]);
    }

    callQueue.push([method, Array.from(args)]);
    return undefined;
  };

  const widget = {
    _q: callQueue,
    _h: null,
    _v: '2.0',
    on() {
      return enqueue('on', arguments);
    },
    once() {
      return enqueue('once', arguments);
    },
    off() {
      return enqueue('off', arguments);
    },
    get() {
      if (!widget._h) {
        throw new Error('[LiveChatWidget] Getters are unavailable before LiveChat loads.');
      }

      return enqueue('get', arguments);
    },
    call() {
      return enqueue('call', arguments);
    },
    init() {
      const script = document.createElement('script');
      script.async = true;
      script.src = TRACKING_SCRIPT_URL;
      document.head.appendChild(script);
    }
  };

  window.LiveChatWidget = widget;

  if (!window.__lc.asyncInit) {
    widget.init();
  }
})();
