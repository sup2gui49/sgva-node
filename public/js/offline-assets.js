(function (global) {
    const loader = {};
    const enabledGroups = new Set();
    let offlineMode = false;

    function setOfflineMode() {
        if (offlineMode) {
            return;
        }
        offlineMode = true;
        document.documentElement.classList.add('offline-mode');
    }

    function enableFallback(group = 'core', options = {}) {
        if (enabledGroups.has(group)) {
            return;
        }
        enabledGroups.add(group);

        if (group === 'core' || options.forceOfflineMode) {
            setOfflineMode();
        }

        document.querySelectorAll(`[data-offline-style="${group}"]`).forEach(link => {
            link.disabled = false;
        });
    }

    function preferCdnStyles() {
        const links = document.querySelectorAll('link[data-cdn]');
        if (!links.length) {
            return;
        }

        links.forEach(link => {
            link.addEventListener('error', function () {
                enableFallback(link.dataset.offlineGroup || 'core');
            }, { once: true });

            const cdn = link.getAttribute('data-cdn');
            if (!cdn || !navigator.onLine) {
                return;
            }

            const probe = document.createElement('link');
            probe.rel = 'stylesheet';
            probe.href = cdn;
            probe.onload = function () {
                link.href = cdn;
                probe.remove();
            };
            probe.onerror = function () {
                enableFallback(link.dataset.offlineGroup || 'core');
                probe.remove();
            };
            document.head.appendChild(probe);
        });
    }

    function injectScript(src, attrs = {}) {
        const { onload, onerror, ...htmlAttrs } = attrs;
        const script = document.createElement('script');
        Object.entries(htmlAttrs).forEach(([key, value]) => {
            if (value != null) {
                script.setAttribute(key, value);
            }
        });
        if (typeof onload === 'function') {
            script.onload = onload;
        }
        if (typeof onerror === 'function') {
            script.onerror = onerror;
        }
        script.src = src;
        return script;
    }

    function loadScriptWithFallback(cdnSrc, localSrc, attrs = {}) {
        const { onload, onerror, ...htmlAttrs } = attrs;
        const target = htmlAttrs.target === 'head' ? document.head : document.body;

        if (navigator.onLine && cdnSrc) {
            const cdnScript = injectScript(cdnSrc, {
                ...htmlAttrs,
                onload,
                onerror: (event) => {
                    cdnScript.remove();
                    if (localSrc) {
                        target.appendChild(injectScript(localSrc, { ...htmlAttrs, onload }));
                    }
                    enableFallback();
                    if (typeof onerror === 'function') {
                        onerror(event);
                    }
                }
            });
            target.appendChild(cdnScript);
            return;
        }

        if (localSrc) {
            target.appendChild(injectScript(localSrc, { ...htmlAttrs, onload, onerror }));
        }
    }

    loader.enableFallback = enableFallback;
    loader.loadScript = loadScriptWithFallback;
    loader.initStyles = preferCdnStyles;

    if (!navigator.onLine) {
        enableFallback('core');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preferCdnStyles, { once: true });
    } else {
        preferCdnStyles();
    }

    global.AssetLoader = loader;
})(window);
