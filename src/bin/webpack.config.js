//@ts-check
'use strict';

const path = require('path');

const electonBaseConfiguration = {
    devtool: 'source-map',
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(process.cwd(), './tsconfig.json')
                        }
                    }
                ]
            }
        ]
    }
};

const extension = {
    ...electonBaseConfiguration,
    externals: {
        vscode: 'commonjs vscode'
    },
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: 'vscode-electron.js',
        libraryTarget: 'commonjs2',
    },
    target: "node",
    entry: {
        main: './lib/main.ts'
    },
    mode: 'development'
}

module.exports = [
    extension
];
