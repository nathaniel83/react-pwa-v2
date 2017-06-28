import _ from "lodash";
import {
  getRouteFromPath,
} from "./bundler";

import storage from "lib/storage";
import api from "lib/api";

/**
 * Rendering utilities
 */
import {
  renderNotFoundPage,
  renderErrorPage,
  renderRoutesByUrl,
  getPreloadDataPromises
} from "./renderer";

import { generateMeta } from "./seo";


export const showScreenLoader = () => {
  const pageloadstartEvent = new CustomEvent("screenloadstart");
  window.dispatchEvent(pageloadstartEvent);
};
export const hideScreenLoader = () => {
  const pageloadendEvent = new CustomEvent("screenloadend");
  window.dispatchEvent(pageloadendEvent);
};

const updateHtmlMeta = (collectedRoutes, url) => {

  const currentRoutes = getRouteFromPath(collectedRoutes, url);

  let seoData = {};
  _.each(currentRoutes, r => {
    seoData = _.defaults({}, _.get(r, "seo", {}), seoData);
  });

  const allMeta = generateMeta(seoData);

  // Remove all meta tags
  const head = document.head;
  Array.from(head.getElementsByTagName("meta")).forEach(tag => tag.remove());

  let title = "";
  allMeta.forEach(meta => {
    if (meta.itemProp === "name") {
      title = meta.content;
    }
    const metaTag = document.createElement("meta");
    _.each(meta, (value, key) => {
      if (key === "itemProp")  {
        key = "itemprop";
      }
      metaTag.setAttribute(key, value);
    });
    head.appendChild(metaTag);
  });
  head.getElementsByTagName("title")[0].innerHTML = title;
};


/**
 * Render routes for the provided url
 * @param url
 * @param collectedRoutes
 * @param renderRoot
 * @param store
 * @param options
 */
export const renderRoutes = async ({
  url,
  collectedRoutes,
  renderRoot,
  store,
  history,
  options = {
    showScreenLoader: false,
    isInitialLoad: false
  }
}) => {

  // Get current routes from the routes we need to load data
  const currentRoutes = getRouteFromPath(collectedRoutes, url);

  // If no routes are matching our criteria, that means we have a 404
  // else react-router is taking care of it.
  if (!currentRoutes.length) {
    renderNotFoundPage({
      history,
      renderRoot: renderRoot,
      url: url,
      store
    });
    return Promise.resolve();
  }

  // Preload Data
  let promises = getPreloadDataPromises({
    routes: currentRoutes,
    storage,
    api
  });

  if (promises.length && !options.isInitialLoad) {
    showScreenLoader();
  }

  try {
    await Promise.all(promises);
    updateHtmlMeta(collectedRoutes, url);
    renderRoutesByUrl({
      routes: currentRoutes,
      history,
      renderRoot,
      url,
      store
    });
    return Promise.resolve();
  } catch (err) {
    let error = err;
    if (!(error instanceof Error)) {
      error = new Error(err);
    }
    error.statusCode = error.statusCode || 500;
    renderErrorPage({
      history: history,
      renderRoot: renderRoot,
      error: error,
      store
    });
    return Promise.reject();
  }
};

export const isRelatedRoute = (prevUrl, currUrl, collectedRoutes) => {
  const prevRoutes = getRouteFromPath(collectedRoutes, prevUrl);
  const currRoutes = getRouteFromPath(collectedRoutes, currUrl);
  const currExactRoute = _.find(currRoutes, { match: {isExact: true} });

  const isParent = !_.isEmpty(_.find(prevRoutes, currExactRoute));
  let isChild = false;
  _.each(prevRoutes, route => {
    if (isChild) return;
    isChild = !_.isEmpty(_.find(_.get(route, "routes", []), currExactRoute));
  });
  return isParent || isChild;
};

/**
 * Load routes when a bundle is included,
 * this will be called from pages
 * @param routes
 * @param collectedRoutes
 */
export const updateRoutes = ({routes, collectedRoutes}) => {

  _.each(routes, route => {
    // remove functions as we cannot use find with functions in object
    const lessRoute = JSON.parse(JSON.stringify(route));
    const index = _.findIndex(collectedRoutes, lessRoute);

    if(index === -1) {
      collectedRoutes.push(route);
    } else {
      collectedRoutes[index] = route;
    }
  });
};