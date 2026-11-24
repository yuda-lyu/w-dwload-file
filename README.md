# w-dwload-file
A download tool for file.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-dwload-file.svg?style=flat)](https://npmjs.org/package/w-dwload-file) 
[![license](https://img.shields.io/npm/l/w-dwload-file.svg?style=flat)](https://npmjs.org/package/w-dwload-file) 
[![npm download](https://img.shields.io/npm/dt/w-dwload-file.svg)](https://npmjs.org/package/w-dwload-file) 
[![npm download](https://img.shields.io/npm/dm/w-dwload-file.svg)](https://npmjs.org/package/w-dwload-file) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-dwload-file.svg)](https://www.jsdelivr.com/package/npm/w-dwload-file)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-dwload-file/global.html).

## Installation

### Using npm(ES6 module):
```alias
npm i w-dwload-file
```

#### Example:
> **Link:** [[dev source code](https://github.com/yuda-lyu/w-dwload-file/blob/master/g.mjs)]
```alias
import fs from 'fs'
import WDwloadFile from './src/WDwloadFile.mjs'

async function test() {

    //url
    let url = `https://cdn.jsdelivr.net/npm/w-demores/res/video/aigen.mp4`

    //fp
    let fp = './abc.mp4'

    //funProg
    let funProg = (prog, nn, na) => {
        console.log('prog', `${prog.toFixed(2)}%`, nn, na)
    }

    //WDwloadFile
    await WDwloadFile(url, fp, {
        funProg,
    })

    //len
    let len = fs.statSync(fp).size
    console.log('len', len)

    console.log('done:', fp)
}
test()
    .catch((err) => {
        console.log('catch', err)
    })
// prog 0.97% 1378 140769
// prog 100.00% 140769 140769
// len 140769
// done: ./abc.mp4
```

## 測試之網路需求

`npm test`(`mocha --parallel`)**不需外網**,斷網環境下亦全綠:

| 測試 | 需要 | 說明 |
|---|---|---|
| `WDwloadFile.test.mjs`(`download`、`download funProg`,僅 Windows 執行) | 無需外網 | 樣本(`w-demores` 之 `res/video/aigen.mp4`,140769 位元組,sha256 `3af7e794…b70b`,與 jsDelivr 上之檔逐位元相同,2026-11-25 核對)存於 `test/fixtures/aigen.mp4`,由本機 HTTP 服務(`test/tools/sampleServer.mjs`,只綁 `127.0.0.1`,埠由作業系統配發)供應,不連 CDN;測試期間 axios 之對外請求一律經不通之代理(只有 `127.0.0.1`、`localhost` 直連),與網路是否暢通無關(任何對外請求即連線失敗).限制:該代理只截斷會讀代理環境變數之請求(axios),不宣稱程序整體零對外請求;第二列之守門測試只證明測試與工具之原始碼內無外部網址 |
| `api-sampleServer.test.mjs`、`unit-testNetworkGuard.test.mjs` | 無需外網 | 本機樣本服務與代理隔離之自身測試;靜態掃描測試與工具不含 CDN 網域或非本機網址、真跑 `WDwloadFile` 之測試檔皆接上本機服務與隔離 |

本說明上方之範例與 `src/WDwloadFile.mjs` 之 JSDoc 範例仍以 jsDelivr 之網址為例,屬使用說明,不屬測試.
