/**

 * Runs before React hydration — marks Capacitor WebView and sets platform classes.

 * Android 15+: measure env(safe-area-inset-top) when edge-to-edge; otherwise 0.

 */

(function () {

  var html = document.documentElement;



  function isCapacitorWebView() {

    try {

      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {

        return true;

      }

    } catch (e) {}



    var host = location.hostname || '';

    var isBundledHost = host === 'book.waadi.in' || host === 'localhost';

    return isBundledHost && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  }



  function isAndroid() {

    try {

      if (window.Capacitor && window.Capacitor.getPlatform) {

        return window.Capacitor.getPlatform() === 'android';

      }

    } catch (e) {}

    return /Android/i.test(navigator.userAgent || '');

  }



  function readEnvTopInset() {

    try {

      var probe = document.createElement('div');

      probe.style.cssText =

        'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';

      html.appendChild(probe);

      var top = probe.getBoundingClientRect().height || 0;

      html.removeChild(probe);

      return top > 0 ? Math.round(top) : 0;

    } catch (e) {

      return 0;

    }

  }



  function readVisualViewportTopInset() {

    try {

      var offsetTop = window.visualViewport && window.visualViewport.offsetTop;

      return offsetTop > 0 ? Math.round(offsetTop) : 0;

    } catch (e) {

      return 0;

    }

  }



  function setTopInset(top) {

    var px = Math.max(0, Math.round(top)) + 'px';

    html.style.setProperty('--app-safe-area-top', px);

    html.style.setProperty('--safe-area-inset-top', px);

  }



  function boot() {

    if (!isCapacitorWebView()) return;



    html.classList.add('capacitor-native');



    if (isAndroid()) {

      html.classList.add('capacitor-android');

      setTopInset(Math.max(readEnvTopInset(), readVisualViewportTopInset()));

      return;

    }



    html.classList.add('capacitor-ios');



    var top = Math.max(readEnvTopInset(), readVisualViewportTopInset());

    setTopInset(top);

  }



  boot();

  document.addEventListener('DOMContentLoaded', boot);

  window.addEventListener('load', boot);

})();


