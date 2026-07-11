const path = require("node:path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const devCerts = require("office-addin-dev-certs");

const ICON_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAINSURBVHhe7ZaxkQIxDEXpgrbIr4TrgKEAWiAioAYyEiogoILNoArf7HHc4K9vW7aXm9uRNPMS4V3kZ9nrxfLzI1hmgQlruABMWMMFYMIaLgAT1nABmLCGC8CENVwAJqzhAjBhDReACWu4AEw0c7iEXJwP5JmITdjf42eG04aMm5ZuAavTLa66EOlJzVBA7eSfwSc2NwGFls/HLey3+M6ZCVhf42K/47oT49jE+Fg57h8L2IVzXGuhWDm5cD+GVWFM/p3T8EcCNOgE6DtPR6MAWSzf1zXId6IAeuiKTqqjUUBiJX6i/M1n5AW8Y/IjzQKW22MYsCAW6vbMCKBfnEtYi3fU0y5ghBaWDmzpmIQAKnqayY/0CRihBeaDbxEm4CgO2/6zJqZfwJNKEbIbpAAW8rk+phPwimpr4ErqBMjn+niPgFcynRGvplZAzcFa5v0CfpGXp3giaQHDXX4C+TlST4MAUqhyRcTdQSHg0SXktwnuACMNAvilpLwiDR3w+js5V8r/WaZJQHJfpzqBFD9GPAEpAE980UET3AfaBNBiKkO0cFkAEy/GVNIsgBWsD/Ypk+9jk5Pi+7qgQ8ADWVApUgXrBLAuSG49Bd0CnrCDMYpikUoB9L9YR+mYTMBccQGYsIYLwIQ1XAAmrOECMGENF4AJa7gATFjDBWDCGi4AE9ZwAZiwhgvAhDXMC/gCDaZRSr3cYgYAAAAASUVORK5CYII=";

class PngIconPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("PngIconPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: "PngIconPlugin", stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => compilation.emitAsset(
          "assets/icon.png",
          new compiler.webpack.sources.RawSource(Buffer.from(ICON_PNG_BASE64, "base64"))
        )
      );
    });
  }
}

module.exports = async (_env, argv) => {
  const development = argv.mode !== "production";
  return {
    entry: "./src/taskpane.ts",
    output: {
      clean: true,
      filename: "taskpane.js",
      path: path.resolve(__dirname, "dist")
    },
    devtool: development ? "source-map" : false,
    module: {
      rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: "ts-loader" }]
    },
    resolve: { extensions: [".ts", ".js"] },
    plugins: [
      new HtmlWebpackPlugin({ template: "./src/taskpane.html", filename: "taskpane.html" }),
      new PngIconPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: "./src/taskpane.css", to: "taskpane.css" },
          { from: "./assets", to: "assets" },
          { from: "./manifest.word.xml", to: "manifest.word.xml" },
          { from: "./manifest.outlook.xml", to: "manifest.outlook.xml" }
        ]
      })
    ],
    devServer: {
      port: 3001,
      server: development ? { type: "https", options: await devCerts.getHttpsServerOptions() } : "https",
      headers: { "Access-Control-Allow-Origin": "*" },
      proxy: [{ context: ["/api"], target: "http://127.0.0.1:8000", changeOrigin: true }],
      hot: false
    }
  };
};
