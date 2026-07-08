/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const urlDev = "https://localhost:3000/";
const urlProd = "https://obiter.com.au/app/";

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      taskpane: ["./src/taskpane/taskpane.ts", "./src/taskpane/taskpane.html"],
      commands: "./src/commands/commands.ts",
      // Staged shared-runtime page for the Copilot skill (COPILOT-010). Additive;
      // the production manifest.xml does not reference it.
      sharedRuntime: ["./src/runtime/sharedRuntime.ts", "./src/runtime/sharedRuntime.html"],
    },
    output: {
      clean: true,
      // sharedRuntime keeps a stable (unhashed) filename so the unified
      // manifest's runtime `code.script` can reference it across builds — the
      // Copilot executeDataFunction runtime needs an explicit script URL
      // (matching Microsoft's combine-agents-with-add-ins sample). Other
      // entries stay content-hashed for cache-busting.
      filename: (pathData) =>
        pathData.chunk.name === "sharedRuntime"
          ? "sharedRuntime.js"
          : dev
            ? "[name].js"
            : "[name].[contenthash:8].js",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|jpg|jpeg|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "src/styles/AGLC4.xsl",
            to: "AGLC4.xsl",
          },
          {
            from: "src/sw.js",
            to: "sw.js",
          },
          {
            from: "src/shortcuts.json",
            to: "shortcuts.json",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              if (dev) {
                return content;
              } else {
                return content.toString().replace(new RegExp(urlDev, "g"), urlProd);
              }
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"],
      }),
      new HtmlWebpackPlugin({
        filename: "sharedRuntime.html",
        template: "./src/runtime/sharedRuntime.html",
        chunks: ["polyfill", "sharedRuntime"],
      }),
    ],
    devServer: {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      server: {
        type: "https",
        options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 3000,
    },
  };

  return config;
};
