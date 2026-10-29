(function () {
    const isLocalDev = window.location.hostname === "localhost" && window.location.port === "8081";
    const defaultApiUrl = isLocalDev ? "http://localhost:8080" : window.location.origin;

    window.APP_CONFIG = {
        API_BASE_URL: defaultApiUrl,
        BASIC_URL: window.location.origin,
    };
})();
