# Screenly TRACX MVP

This repository contains a simple example of an integration between Screenly and TRACX.

## Prerequisites

- Ensure you have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
- Install all the necessary dependencies by running:
```npm install```

## Deploying the example

### Development

1. **Run Webpack in Watch Mode:**

 This will automatically rebuild your project whenever you make changes to the source files.

```npx webpack --watch```

2. **Serve the App Locally:**

Use the `screenly edge-app run` command to serve your app locally.

```screenly edge-app run```

This will start the app, and you should be able to access it from your browser.

### Production

1. **Build the App for Production:**

This will create optimized builds suitable for production environments.

```npx webpack --mode production```

2. **Serve the App:**

Just like in development, use the `screenly edge-app run` command.

```screenly edge-app run```

## Contributing

If you'd like to contribute to this project, please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.