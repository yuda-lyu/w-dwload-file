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

//node g.mjs
