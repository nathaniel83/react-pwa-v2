import express from "express";
import _ from "lodash";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  StaticRouter as Router,
  Route,
  Switch,
  matchPath
} from "react-router";

import RouteWithSubRoutes from "app/components/route/with-sub-routes";
import Html from "app/components/html";
import { extractFilesFromAssets } from "utils/bundler";

// Create and express js application
const app = express();

// Set x-powered-by to false (security issues)
_.set(app, "locals.settings.x-powered-by", false);

// Add public path to server from public folder
// This is used when doing server loading
app.use("/public", express.static("public"));

// Middleware to add assets to request
try {
  const assets = require("./config/assets").default;
  app.use(function (req, res, next) {
    req.assets = assets;
    next();
  });
} catch (ex) {
  // Do not do anything here.
  // cause the assets are most probably handled by webpack in dev mode
}

export const getModuleFromPath = (routes, path) => {
  "use strict";
  let mod = false;

  _.each(routes, route => {
    if(matchPath(path, route)) {
      mod = route.bundleKey;
    }
  });
  return mod;
};

export default app;

export const startServer = (purge = false) => {

  app.get("*", (req, res) => {

    /**
     * Purge and get new routes
     */
    if (purge) {
      purgeCache([
        "./routes",
        "app/components/error/404",
        "app/components/html"
      ]);
    }
    let routes  = require("./routes").default;
    let NotFoundPage = require("app/components/error/404").default;
    let ErrorPage = require("app/components/error/500").default;

    const { assets } = req;

    /**
     * Get all css and js files for mapping
     */
    const allCss = extractFilesFromAssets(assets, ".css");
    const allJs = extractFilesFromAssets(assets, ".js");

    let mod = getModuleFromPath(routes, req.path);

    /**
     * Get routes for current module, we can get all the routes,
     * but that breaks the server side rendering as client will not have
     * all the routes loaded
     */
    const currentModRoutes = _.filter(routes, route => {
      return route.bundleKey === mod;
    });

    /**
     * Get css generated by current route and module
     */
    const currentRouteCss = _.filter(allCss, css => {
      const fileName = css.split("/").pop();
      return !(_.startsWith(fileName, "mod-") && fileName.indexOf(mod) === -1);
    });

    /**
     * Get all javascript but the modules
     */
    const currentRouteJs = _.filter(allJs, js => {
      const fileName = js.split("/").pop();
      return !_.startsWith(fileName, "mod-");
    });


    const context = {};

    let html, statusCode;
    try {
      const routerComponent = (
        <Router
          location={req.path}
          context={context}
        >
          <Switch>
            {_.map(currentModRoutes, (route, i) => {
              return <RouteWithSubRoutes key={i} {...route}/>;
            })}
            <Route component={NotFoundPage}/>
          </Switch>
        </Router>
      );
      html = ReactDOMServer.renderToStaticMarkup((
        <Html
          stylesheets={currentRouteCss}
          scripts={currentRouteJs}
          globals={{
            routes: routes,
            allCss: allCss,
            allJs: allJs,
          }}
        >
          {routerComponent}
        </Html>
      ));

      statusCode = context.status || 200;
      if (context.url) {
        // Somewhere a `<Redirect>` was rendered
        return res.status((context.status|| 301)).redirect(context.url);
      }
    } catch (ex) {
      html = ReactDOMServer.renderToStaticMarkup((
        <Html
          stylesheets={currentRouteCss}
          scripts={currentRouteJs}
          globals={{
            routes: routes,
            allCss: allCss,
            allJs: allJs,
          }}
        >
          <ErrorPage error={ex} />
        </Html>
      ));
      statusCode = 500;
    }

    return res.status(statusCode).send(`<!DOCTYPE html>${html}`);
  });

  app.listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log("App Started ==> Open http://localhost:3000 to see the app");
  });
};

/**
 * Removes a module from the cache
 */
function purgeCache(modules) {
  _.each(modules, moduleName => {
    "use strict";
    // Traverse the cache looking for the files
    // loaded by the specified module name
    searchCache(moduleName, function (mod) {
      delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
      if (cacheKey.indexOf(moduleName)>0) {
        delete module.constructor._pathCache[cacheKey];
      }
    });
  });
};

/**
 * Traverses the cache to search for all the cached
 * files of the specified module name
 */
function searchCache(moduleName, callback) {
  // Resolve the module identified by the specified name
  let mod = require.resolve(moduleName);

  // Check if the module has been resolved and found within
  // the cache
  if (mod && ((mod = require.cache[mod]) !== undefined)) {
    // Recursively go over the results
    (function traverse(mod) {
      // Go over each of the module's children and
      // traverse them
      mod.children.forEach(function (child) {
        traverse(child);
      });

      // Call the specified callback providing the
      // found cached module
      callback(mod);
    }(mod));
  }
};
