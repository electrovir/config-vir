# config-vir

Load and validate configuration files from local paths or URLs in Node.js or a browser.

-   JSON
-   YAML
-   TOML
-   JavaScript: Executed as an ES module. Because this executes real code, **only use trusted config files.**
-   TypeScript: Executed through `tsx` in Node.js and ignored in browsers. Because this executes real code, **only use trusted config files.**

Local filesystem paths work in Node.js, and URLs are fetched with `fetch`, including in browsers.

Reference docs: https://electrovir.github.io/config-vir

## Install

```sh
npm i config-vir
```

## Usage

Pass `loadConfig` a config path and an `object-shape-tester` shape. The config's file type is inferred from its extension.

<!-- example-link: src/readme-examples/load-config.example.ts -->

```TypeScript
import {defineShape} from 'object-shape-tester';
import {loadConfig} from 'config-vir';

const config = await loadConfig({
    configPath: './config.yaml',
    configShape: defineShape({
        apiUrl: '',
        retryCount: 0,
    }),
});
```
