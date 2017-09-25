import _ from "lodash";
import createHistory from "history/createBrowserHistory";
import configureStore, { injectAsyncReducers } from "./store";

/**
 * Network actions for monitoring network changes (online/offline)
 */
import {
  NETWORK_STATE_ONLINE,
  NETWORK_STATE_OFFLINE,
  networkOnline,
  networkOffline
} from "./libs/network/action";

/**
 * Client utilities
 */
import {
  renderRoutes,
  updateRoutes,
  showScreenLoader,
  scrollToTop,
  hideScreenLoader,
} from "./utils/client";

/**
 * Bundling utilities
 */
import {
  loadModuleByUrl,
  idlePreload,
  getModuleByUrl,
} from "./utils/bundler";

import { trackPageView } from "./utils/analytics";

/**
 * Get API instance
 */
import ApiInstance from "./libs/api";

/**
 * Settings
 */
import {
  enableServiceWorker
} from "../../settings";

import { renderNotFoundPage } from "./utils/renderer";

const hot = !!module.hot;

// Set a namespace-d global when in development mode
let global = {};

// Custom reducers
let [reduxReducers, reduxInitialState] = [null, {}];

const start = () => {
  if (hot && typeof window !== "undefined") {
    global = window["__GLOBALS"] || {};
    window["__GLOBALS"] = global;
  }

  // Collect routes from all the routes
  // loaded over time
  global.collectedRoutes = global.collectedRoutes || [];

  // Create enhanced history with
  global.history = global.history || createHistory();

  // Create redux store
  global.store = global.store || configureStore({
    history: global.history,
    
    initialState: _.assignIn({}, {
      network: {
        state: window.navigator.onLine ? NETWORK_STATE_ONLINE: NETWORK_STATE_OFFLINE,
      }
    }, reduxInitialState),
    ...(reduxReducers ? { reducers: reduxReducers} : {})
  });

  // Store state if we are working with history change
  global.isHistoryChanging = global.isHistoryChanging || false;

  // check if application is loaded initially or its just a hot update from HMR
  global.isInitialLoad = typeof global.isInitialLoad === Boolean ? global.isInitialLoad: true;

  // Check if service worker already initialized
  global.isSWInitialized = typeof global.isSWInitialized === Boolean ? global.isSWInitialized: false;
  
  // Set previous url
  global.previousUrl = global.previousUrl || "";

  // Check if current browser/client supports service worker
  const supportsServiceWorker = !!_.get(window, "navigator.serviceWorker", false);

  // Monitor online and offline state of application
  /**
   * Need to check for online/offline status
   */
  const updateNetworkStatus = (status) => {
    global.store.dispatch((status === NETWORK_STATE_ONLINE ? networkOnline(): networkOffline()));
  };
  const setNetworkOnline = () => updateNetworkStatus(NETWORK_STATE_ONLINE);
  const setNetworkOffline = () => updateNetworkStatus(NETWORK_STATE_OFFLINE);

  // Just in case OR with HMR if client.js is included twice lets remove the
  // eventListener and then add it again
  window.removeEventListener("online",  setNetworkOnline);
  window.addEventListener("online",  setNetworkOnline);
  
  window.removeEventListener("offline", setNetworkOffline);
  window.addEventListener("offline", setNetworkOffline);
  
  /** Api requires store to check the network status */
  ApiInstance.setStore(global.store);
  
  /**
   * Service worker configuration
   */
  if (!global.isSWInitialized && enableServiceWorker && supportsServiceWorker) {
    const serviceWorker = _.get(window, "navigator.serviceWorker", {
      register: async () => Promise.reject("Browser does not support service workers!")
    });
    
    // Register service worker
    serviceWorker.register("/sw.js", {scope: "/"})
      .then(reg => {
        
        // Inform API that it can now accept sw cache options
        ApiInstance.setState("SW_ENABLED", true);
        reg.onupdatefound = function() {
          let installingWorker = reg.installing;
          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case "activated":
                // eslint-disable-next-line
                console.log("Updated service worker");
                break;
            }
          };
        };
      })
      .catch(err => {
        // eslint-disable-next-line
        console.log("Cannot register Service Worker: ", err);
      });
    
    // @todo handle messaging via service worker
    if (serviceWorker.addEventListener) {
      serviceWorker.addEventListener("message", (event) => {
        let message = event.data;
        try {
          message = JSON.parse(event.data);
        } catch (ex) {
          if (_.isString(event.data)) {
            message = {
              message: event.data
            };
          }
        }
        /**
         * @todo Enable messaging via Service worker
         */
        // do nothing with messages as of now
        // eslint-disable-next-line
        console.log(message);
      });
    }
    global.isSWInitialized = true;
  }

  // Unregister previously registered service worker if any when enableServiceWorker = false
  if (supportsServiceWorker && !enableServiceWorker) {
    window.navigator.serviceWorker.getRegistrations().then(registrations => {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }

  // Get our dom app
  global.renderRoot = global.renderRoot || document.getElementById("app");
  
  const renderRoutesWrapper = ({
    url = global.previousUrl,
  }) => {
    
    return renderRoutes({
      url: url,
      store: global.store,
      history: global.history,
      renderRoot: global.renderRoot,
      collectedRoutes: global.collectedRoutes,
      options: {
        isInitialLoad: global.isInitialLoad
      }
    }).then(() => {
      global.previousUrl = url;
      global.isInitialLoad = false;
      global.isHistoryChanging = false;
    }).catch((ex) => {
      // eslint-disable-next-line
      console.log(ex);
      global.previousUrl = url;
      global.isInitialLoad = false;
      global.isHistoryChanging = false;
    });
  };
  
  const updateByUrl = url => {
    // Show screen loader asap
    !global.isInitialLoad && showScreenLoader(global.store);
    
    // Track page view
    trackPageView().catch();
    
    /**
     * @todo Correct getModuleByUrl function
     * @type {boolean}
     */
    const module = getModuleByUrl(url);
    
    if (!module) {
      // If no module found for the route simple ask to render it as it will display
      // 404 page
      return renderNotFoundPage({
        history: global.history,
        renderRoot: global.renderRoot,
        url: url,
        routes: [],
        store: global.store
      }, () => {
        !global.isInitialLoad && hideScreenLoader(global.store);
        scrollToTop();
      });
    }
    // Load module and render
    loadModuleByUrl(url, () => {
      renderRoutesWrapper({ url });
    });
  };
  
  
  if (global.unlisten) global.unlisten();
  
  global.unlisten = global.history.listen( location => {
    // Set the record for last changed url
    global.previousUrl = location.pathname;
    
    if (window["ignoreHistoryChange"]) {
      window["ignoreHistoryChange"] = null;
      delete window["ignoreHistoryChange"];
      return false;
    }
    
    global.isHistoryChanging = true;
    updateByUrl(location.pathname);
  });

  // Add update routes globally
  ((w) =>{
    
    // Polyfill for CustomEvent
    (function() {
      if ( typeof w.CustomEvent === "function" ) return false; //If not IE
      function CustomEvent ( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        let evt = document.createEvent( "CustomEvent" );
        evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
      }
      CustomEvent.prototype = w.Event.prototype;
      w.CustomEvent = CustomEvent;
    })();
    
    w.__updatePage = ({ routes, reducers }) => {
      const routesloadEvent = new CustomEvent("routesload");
      injectAsyncReducers(global.store, reducers);
      updateRoutes({ routes, collectedRoutes: global.collectedRoutes });
      w.dispatchEvent(routesloadEvent);
    };
    
    w.__renderRoutes = () => {
      if (!global.isHistoryChanging) {
        renderRoutesWrapper({
          url: global.previousUrl
        });
      }
    };
    
  })(window);
  
  global.previousUrl = window.location.pathname;
  loadModuleByUrl(global.previousUrl, () => {
    // Start preloading data if service worker is not
    // supported. We can cache data with serviceWorker
    (!supportsServiceWorker || !enableServiceWorker) && idlePreload(5000);
  });
};

export default {
  setReduxInitialState: (initialState) => {
    reduxInitialState = initialState;
  },
  setReduxReducers: (reducers) => {
    reduxReducers = reducers;
  },
  start,
};
if (hot) module.hot.accept();
