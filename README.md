# kyh.io

[![Build Status](https://travis-ci.org/tehkaiyu/tehkaiyu.github.io.svg?branch=master)](https://travis-ci.org/tehkaiyu/tehkaiyu.github.io)
[![NPM version](https://badge.fury.io/js/badge-list.svg)](http://badge.fury.io/js/badge-list)

Made with lots of love, and some JavaScript.

## Development Setup

``` bash
# install dependencies
yarn

# serve with hot reload at localhost:8080
yarn dev
```

## Deployment
Deployment on Github pages is a little tricky since you can't point gh-pages to a specific folder as your root.

You can deploy by running:
```bash
yarn deploy
```

This will do two things:
1) Build for production with minification in the `dist` folder
2) Copy contents of the `dist` folder into the root

Push the changes up to master which will automatically deploy the changes.
