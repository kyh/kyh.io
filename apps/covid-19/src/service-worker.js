const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
  window.location.hostname === "[::1]" ||
  /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/u.test(window.location.hostname),
);

const onInstalled = (registration, config) => {
  if (navigator.serviceWorker.controller) {
    console.log(
      "New content is available and will be used when all " +
        "tabs for this page are closed. See https://bit.ly/CRA-PWA.",
    );

    if (config && config.onUpdate) {
      config.onUpdate(registration);
    }
  } else {
    console.log("Content is cached for offline use.");

    if (config && config.onSuccess) {
      config.onSuccess(registration);
    }
  }
};

const registerValidSW = async (swUrl, config) => {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;

      if (installingWorker === null) {
        return;
      }

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") {
          onInstalled(registration, config);
        }
      });
    });
  } catch (error) {
    console.error("Error during service worker registration:", error);
  }
};

const checkValidServiceWorker = async (swUrl, config) => {
  let response;

  try {
    response = await fetch(swUrl, {
      headers: { "Service-Worker": "script" },
    });
  } catch {
    console.log("No internet connection found. App is running in offline mode.");

    return;
  }

  const contentType = response.headers.get("content-type");

  if (response.status === 404 || (contentType !== null && !contentType.includes("javascript"))) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    window.location.reload();
  } else {
    registerValidSW(swUrl, config);
  }
};

export const register = (config) => {
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);

    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener("load", async () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);

        await navigator.serviceWorker.ready;
        console.log(
          "This web app is being served cache-first by a service " +
            "worker. To learn more, visit https://bit.ly/CRA-PWA",
        );
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
};

export const unregister = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.unregister();
    } catch (error) {
      console.error(error.message);
    }
  }
};
