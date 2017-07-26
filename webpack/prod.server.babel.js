import path from "path";
import webpack from "webpack";
import UglifyJSPlugin from "uglifyjs-webpack-plugin";

/**
 * @description It moves all the require("style.css")s in entry chunks into
 * a separate single CSS file. So your styles are no longer inlined
 * into the JS bundle, but separate in a CSS bundle file (styles.css).
 * If your total stylesheet volume is big, it will be faster because
 * the CSS bundle is loaded in parallel to the JS bundle.
 */
import ExtractTextPlugin from "extract-text-webpack-plugin";

/**
 * @description PostCSS plugin to parse CSS and add vendor prefixes
 * to CSS rules using values from Can I Use. It is recommended by Google
 * and used in Twitter and Taobao.
 */
import autoprefixer from "autoprefixer";

import {
  srcDir,
  distDir, distPublicDir,
} from "../directories";

import rules from "./prod.rules";

export default [{
  
  name: "server",
  // The base directory, an absolute path, for resolving entry points
  // and loaders from configuration. Lets keep it to /src
  context: srcDir,

  // The point or points to enter the application. At this point the
  // application starts executing. If an array is passed all items will
  // be executed.
  entry: [
    "babel-polyfill",
    // Initial entry point
    path.join(srcDir, "start-server.js"),
  ],

  //These options determine how the different types of modules within
  // a project will be treated.
  module: {
    rules: rules({imageOutputPath: "public/build/images/"}),
  },
  resolve: {
    modules: [
      "node_modules",
      srcDir
    ],
  },
  output: {

    // Output everything in dist folder
    path: distDir,

    // The file name to output
    filename: "server.js",

    // public path is assets path
    publicPath: "/",
  },

  node: {
    __filename: true,
    __dirname: true
  },
  target: "node",
  devtool: false,

  plugins: [

    // Uglify the output so that we have the most optimized code
    new UglifyJSPlugin({
      compress: true,
      comments: false,
      sourceMap: false,
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
    // Enable no errors plugin
    new webpack.NoEmitOnErrorsPlugin(),

    // Extract the CSS so that it can be moved to CDN as desired
    // Also extracted CSS can be loaded parallel
    new ExtractTextPlugin("server.min.css"),
    // Sass loader options for autoprefix
    new webpack.LoaderOptionsPlugin({
      options: {
        context: "/",
        sassLoader: {
          includePaths: [srcDir]
        },
        postcss: function () {
          return [autoprefixer];
        }
      }
    })
  ],
},
{
  name: "service-worker",
    
  // The base directory, an absolute path, for resolving entry points
  // and loaders from configuration. Lets keep it to /src
  context: srcDir,
    
  // The point or points to enter the application. At this point the
  // application starts executing. If an array is passed all items will
  // be executed.
  entry: {
    "service-worker" : [
      "babel-polyfill",
      // Initial entry point
      path.join(srcDir, "service-worker.js"),
    ]
  },
    
  // These options determine how the different types of modules within
  // a project will be treated.
  module: {
    rules: rules({}),
  },
  resolve: {
    modules: [
      "node_modules",
      srcDir
    ],
  },
  output: {
      
    // Output everything in dist folder
    path: distDir,
      
    // The file name to output
    filename: "[name].js",
      
    // public path is assets path
    publicPath: "/",
  },
  target: "web",
  devtool: false,
    
  plugins: [
      
    // Uglify the output so that we have the most optimized code
    new UglifyJSPlugin({
      compress: true,
      comments: false,
      sourceMap: false,
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
    // Enable no errors plugin
    new webpack.NoEmitOnErrorsPlugin(),
    
    // Sass loader options for autoprefix
    new webpack.LoaderOptionsPlugin({
      options: {
        context: "/",
        sassLoader: {
          includePaths: [srcDir]
        },
        postcss: function () {
          return [autoprefixer];
        }
      }
    })
  ],
}];