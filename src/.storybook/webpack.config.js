const path = require("path");

module.exports = ({ config }) => {
  config.resolve.alias["@"] = path.resolve("src");

  //处理 less
  config.module.rules.push({
    test: /\.less$/,
    use: [
      {
        loader: "style-loader"
      },
      {
        loader: "css-loader"
      },
      {
        loader: "less-loader",
        options: {
          strictMath: false,
          noIeCompat: true,
          javascriptEnabled: true
        }
      }
    ],
    include: [
      path.resolve(__dirname, "../src"),
      path.resolve(__dirname, "../.storybook")
    ]
  });

  // story 默认的 svg 处理方式不支持作为react组件使用，需移除默认的规则
  config.module.rules = config.module.rules.map(rule => {
    if (String(rule.test).indexOf("svg") !== -1) {
      return {
        ...rule,
        test: /\.(ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/
      };
    }

    return rule;
  });

  config.module.rules.push({
    test: /\.svg$/,
    use: ["@svgr/webpack"]
  });

  return config;
};
