const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
    entry: './resources/js/main.js',  // Entry file
    mode: 'development',
    output: {
        filename: 'bundle.js',  // Output bundle file
        path: path.resolve(__dirname, 'static'),  // Output directory
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader, // Extracts CSS into separate files
                    'css-loader',                // Translates CSS into CommonJS
                    'postcss-loader',            // Processes CSS with PostCSS (for Tailwind)
                ],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
    ],
};