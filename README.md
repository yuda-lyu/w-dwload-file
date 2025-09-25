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
    let url = `https://cdn.jsdelivr.net/npm/w-demores@1.0.28/res/video/aigen.mp4`

    //fp
    let fp = './abc.mp4'

    //funProg
    let funProg = (prog, nn, na) => {
        console.log('prog', `${prog.toFixed(2)}%`, nn, na)
    }

    //WDwloadFile
    await WDwloadFile(url, fp, {
        clean: true, //單一程序執行時, 事先清除之前暫存檔, 減少浪費硬碟空間
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
