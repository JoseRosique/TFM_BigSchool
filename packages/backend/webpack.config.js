const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ["webpack/hot/poll?100"],
      }),
    ],
    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          test: /\.(html|cs)$/,
          type: "asset/source",
        },
      ],
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          const lazyImports = [
            "mock-aws-s3",
            "aws-sdk",
            "nock",
            "@nestjs/microservices",
            "@nestjs/microservices/microservices-module",
            "@nestjs/websockets/socket-module",
          ];
          if (!lazyImports.includes(resource)) {
            return false;
          }
          try {
            require.resolve(resource);
          } catch (err) {
            return true;
          }
          return false;
        },
      }),
    ],
  };
};
