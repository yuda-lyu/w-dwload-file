import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import assert from 'assert'
import { fileURLToPath } from 'url'
import WDwloadFile from '../src/WDwloadFile.mjs'
import { startSampleServer, isolateExternal, SAMPLE } from './tools/sampleServer.mjs'


function isWindows() {
    return process.platform === 'win32'
}


//下載檔之落點(test/_tmp/<案名>/, 由本檔之after刪除; 夾本身不預先建立, 一併驗證WDwloadFile會建立不存在之上層資料夾)
let fdTmp = path.join(path.dirname(fileURLToPath(import.meta.url)), '_tmp', 'WDwloadFile')


describe('WDwloadFile', function() {

    //check
    if (!isWindows()) {
        return
    }

    let server = null
    let restore = null

    before(async function() {
        //清掉前次中斷可能殘留之落點夾, 使「WDwloadFile會建立不存在之上層資料夾」之驗證不失效
        fs.rmSync(fdTmp, { recursive: true, force: true })

        //樣本由本機服務供應(規則帳本R1): 不連jsDelivr; 並令axios之對外請求一律經不通之代理, 使任何對外請求即失敗而非依賴網路是否暢通
        restore = isolateExternal()
        server = await startSampleServer()
    })

    after(async function() {
        try {
            if (server) {
                await server.close()
            }
        }
        finally {
            //即使關閉服務失敗, 仍還原環境變數並刪除落點夾
            if (restore) {
                restore()
            }
            fs.rmSync(fdTmp, { recursive: true, force: true })
        }
    })

    async function test() {

        //清空請求紀錄(就地清空, 與server.requests同一陣列)
        server.requests.length = 0

        //url
        let url = server.urls.mp4

        //fp
        let fp = path.join(fdTmp, 'abc.mp4')

        //funProg
        let calls = []
        let funProg = (prog, nn, na) => {
            //console.log('prog', `${prog.toFixed(2)}%`, nn, na)
            calls.push([prog, nn, na])
        }

        //WDwloadFile
        let t0 = Date.now()
        let r = await WDwloadFile(url, fp, {
            funProg,
        })
        let ms = Date.now() - t0

        //buf
        let buf = fs.readFileSync(fp)

        //len
        let len = buf.length
        // console.log('len', len)

        //sha256
        let sha256 = crypto.createHash('sha256').update(buf).digest('hex')

        //unlinkSync
        fs.unlinkSync(fp)

        return { r, len, sha256, calls, ms }
    }
    // test()
    //     .catch((err) => {
    //         console.log('catch', err)
    //     })

    it('download', async function() {

        //對應JSDoc〈下載檔案〉之範例輸出: 大小140769
        let r = 140769
        let rr = await test()
        assert.strict.deepEqual(r, rr.len)

        //回傳'ok'
        assert.strict.deepEqual(rr.r, 'ok')

        //內容與樣本逐位元相同(不只大小)
        assert.strict.deepEqual(rr.sha256, SAMPLE.sha256)

        //只對本機服務取一次樣本, 且無任何其他請求(未知路徑會被記錄為404)
        assert.strict.deepEqual(server.requests.map(v => `${v.method} ${v.url} ${v.status}`), [`GET ${SAMPLE.path} 200`])

    })

    it('download funProg', async function() {

        //對應JSDoc〈下載檔案〉之範例輸出: 最後一次回報為(100, 全部位元組, 全部位元組)
        let rr = await test()
        let calls = rr.calls
        assert.ok(calls.length >= 1, 'funProg was not called')
        assert.strict.deepEqual(calls[calls.length - 1], [100, SAMPLE.size, SAMPLE.size])

        //之前之回報為處理中進度(JSDoc範例之第1行, 如「prog 0.97% 1378 140769」): 至少1次(throttle之leading必在第1塊資料時觸發)
        let pre = calls.slice(0, -1)
        assert.ok(pre.length >= 1, 'funProg should report progress before the final 100%')

        //進度值=已下載量/總量*99(最高99%, 最後100%由完成階段觸發)、已下載量遞增且不超過總量
        for (let k = 0; k < pre.length; k++) {
            assert.ok(pre[k][1] > 0 && pre[k][1] <= SAMPLE.size, `nn[${k}]=${pre[k][1]} should be in (0, total]`)
            assert.strict.deepEqual(pre[k][2], SAMPLE.size)
            assert.ok(Math.abs(pre[k][0] - pre[k][1] / SAMPLE.size * 99) < 1e-9, `prog[${k}]=${pre[k][0]} should be nn/total*99`)
            assert.ok(pre[k][0] < 100, `prog[${k}] should be < 100`)
            if (k > 0) {
                assert.ok(pre[k][1] >= pre[k - 1][1], `nn[${k}] should not decrease`)
            }
        }

        //throttle每秒最多一次: 100%前之回報次數不超過「耗時之整秒數+2」(含第1次leading與邊界餘裕); 本機服務分塊送出(9塊),無throttle時回報次數會等於塊數而超過
        assert.ok(pre.length <= Math.floor(rr.ms / 1000) + 2, `funProg called ${pre.length} times in ${rr.ms} ms`)

    })

})
