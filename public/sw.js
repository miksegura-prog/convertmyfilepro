// Legacy advertising push worker retirement.
// This file deliberately makes no external requests and registers no push handlers.
// Existing installations are unregistered when this replacement activates.
// The website also unregisters older /sw.js registrations on page load.
self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.resolve()
      .then(function () { return self.registration.pushManager && self.registration.pushManager.getSubscription(); })
      .then(function (subscription) { return subscription && subscription.unsubscribe(); })
      .catch(function () {})
      .then(function () { return self.registration.unregister(); })
  );
});
