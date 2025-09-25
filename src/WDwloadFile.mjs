import fs from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import get from 'lodash-es/get.js'
import throttle from 'lodash-es/throttle.js'
import isbol from 'wsemi/src/isbol.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import getPathParent from 'wsemi/src/getPathParent.mjs'
import fsIsFolder from 'wsemi/src/fsIsFolder.mjs'
import fsCreateFolder from 'wsemi/src/fsCreateFolder.mjs'
import axios from 'axios'


/**
 * 下載檔案
 *
 * @param {String} url 輸入檔案網址字串
 * @param {String} fp 輸入儲存mp4檔案路徑字串
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Boolean} [opt.clean=false] 輸入預先清除暫存檔布林值，預設false
 * @param {Function} [opt.funProg=null] 輸入回傳進度函數，傳入參數為prog代表進度百分比、nn代表當前已下載ts檔案數量、na代表全部須下載ts檔案數量，預設null
 * @returns {Promise} 回傳Promise，resolve回傳成功訊息，reject回傳錯誤訊息
 * @example
 *
 * import fs from 'fs'
 * import WDwloadFile from './src/WDwloadFile.mjs'
 *
 * async function test() {
 *
 *     //url
 *     let url = `https://cdn.jsdelivr.net/npm/w-demores@1.0.28/res/video/aigen.mp4`
 *
 *     //fp
 *     let fp = './abc.mp4'
 *
 *     //funProg
 *     let funProg = (prog, nn, na) => {
 *         console.log('prog', `${prog.toFixed(2)}%`, nn, na)
 *     }
 *
 *     //WDwloadFile
 *     await WDwloadFile(url, fp, {
 *         clean: true, //單一程序執行時, 事先清除之前暫存檔, 減少浪費硬碟空間
 *         funProg,
 *     })
 *
 *     //len
 *     let len = fs.statSync(fp).size
 *     console.log('len', len)
 *
 *     console.log('done:', fp)
 * }
 * test()
 *     .catch((err) => {
 *         console.log('catch', err)
 *     })
 * // prog 0.97% 1378 140769
 * // prog 100.00% 140769 140769
 * // len 140769
 * // done: ./abc.mp4
 *
 */
async function WDwloadFile(url, fp, opt = {}) {

    //clean
    let clean = get(opt, 'clean')
    if (!isbol(clean)) {
        clean = false
    }

    //funProg
    let funProg = get(opt, 'funProg')

    //check
    if (!isestr(url)) {
        return Promise.reject('url is not a file')
    }

    //bFunProg
    let bFunProg = isfun(funProg)

    //fd
    let fd = getPathParent(fp)
    if (!fsIsFolder(fd)) {
        fsCreateFolder(fd)
    }

    //以stream方式下載
    let res = await axios.get(url, {
        responseType: 'stream',
        timeout: get(opt, 'timeout', 5 * 60 * 1000), //預設5分鐘
        maxRedirects: get(opt, 'maxRedirects', 5),
        headers: get(opt, 'headers', {}),
        validateStatus: s => s >= 200 && s < 400,
    })

    //nnTotal
    let nnTotal = cdbl(res.headers['content-length'])

    //throttle限制每秒觸發一次
    let funProgThrottle = null
    if (bFunProg) {
        funProgThrottle = throttle((prog, nn, nnTotal) => {
            funProg(prog, nn, nnTotal)
        }, 1000, { leading: true, trailing: true })
    }

    // 計數並回報進度
    let nn = 0
    let progressTap = new Transform({
        transform(chunk, _enc, cb) {
            nn += chunk.length
            let prog = nn / nnTotal * 99 //最高99%, 最後100%由最後完成階段觸發
            if (bFunProg) {
                funProgThrottle(prog, nn, nnTotal)
            }
            cb(null, chunk)
        }
    })

    //pipeline
    await pipeline(
        res.data, //axios的stream
        progressTap, //計數tap
        fs.createWriteStream(fp) //寫入檔案
    )

    //funProg
    if (bFunProg) {
        funProgThrottle?.cancel?.() //清掉throttle已觸發排程
        funProg(100, nnTotal, nnTotal)
    }

    return 'ok'
}


export default WDwloadFile
