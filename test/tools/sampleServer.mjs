import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'


//測試樣本之本機供應(規則帳本R1): 測試不再於執行時自jsDelivr下載樣本, 改由本檔之HTTP服務(只綁127.0.0.1, 埠由作業系統配發)供應
//樣本即w-demores之res/video/aigen.mp4(存於test/fixtures/aigen.mp4, 與jsDelivr上之檔逐位元相同, 2026-11-25以sha256核對)
//未知路徑一律404並記入requests, 使新增之外部依賴在測試中現形
let dirTest = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
let fpSample = path.join(dirTest, 'fixtures', 'aigen.mp4')

//樣本之大小與雜湊(w-demores原檔; 二進位檔, 不受換行轉換影響)
let SAMPLE = {
    path: '/video/aigen.mp4',
    size: 140769,
    sha256: '3af7e7948cc66db55a9e42723e68d7854ba5ba37fb2c97a139f967efce69b70b',
    pieceSize: 16 * 1024, //GET時每塊送出之位元組數
}


/**
 * startSampleServer, 啟動本機樣本服務
 *
 * @returns {Promise} resolve為{ origin, host(實際綁定位址), urls: { mp4 }, requests, close }; requests為[{ method, url, status }]之同一陣列(就地增加); close()為Promise, 關閉並等連線結束
 */
function startSampleServer() {
    let requests = []
    let sample = fs.readFileSync(fpSample)

    let server = http.createServer(async(req, res) => {
        let rec = { method: req.method, url: req.url, status: 0 }
        requests.push(rec)
        let send = (status, headers, body) => {
            rec.status = status
            res.writeHead(status, { 'Cache-Control': 'no-store', ...headers })
            res.end(req.method === 'HEAD' ? undefined : body)
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return send(405, { 'Content-Type': 'text/plain' }, 'method not allowed')
        }
        let pathname = String(req.url).split('?')[0]
        if (pathname === SAMPLE.path) {
            if (req.method === 'HEAD') {
                return send(200, { 'Content-Type': 'video/mp4', 'Content-Length': sample.length })
            }

            //GET: 分塊送出(每塊間讓出事件迴圈), 使用戶端分多次收到資料, 進度回報(funProg)才有多個取樣點可驗
            rec.status = 200
            res.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': 'video/mp4', 'Content-Length': sample.length })
            for (let i = 0; i < sample.length; i += SAMPLE.pieceSize) {
                res.write(sample.subarray(i, i + SAMPLE.pieceSize))
                await new Promise((resolve) => setImmediate(resolve))
            }
            return res.end()
        }
        return send(404, { 'Content-Type': 'text/plain' }, 'not found')
    })

    //closeServer, 關閉服務並等連線結束(含保持連線者)
    let closeServer = () => {
        return new Promise((resolve) => {
            server.close(() => {
                resolve()
            })
            server.closeAllConnections()
        })
    }

    return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => {
            let addr = server.address()
            let origin = `http://127.0.0.1:${addr.port}`
            resolve({
                origin,
                host: addr.address, //實際綁定之位址(須為127.0.0.1)
                urls: { mp4: `${origin}${SAMPLE.path}` },
                requests,
                close: closeServer,
            })
        })
    })
}


//isolateExternal會改寫之環境變數名稱(單一來源; 測試以ISOLATE_KEYS核對還原)
//代理: proxy-from-env 1.x會讀npm_config_*(2.x不讀), 跨版本保險一併蓋掉; 大小寫皆設(Linux分大小寫, proxy-from-env先讀小寫)
let KEYS_PROXY = ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy', 'npm_config_proxy', 'npm_config_http_proxy', 'npm_config_https_proxy']
let KEYS_NO_PROXY = ['NO_PROXY', 'no_proxy', 'npm_config_no_proxy']
let ISOLATE_KEYS = [...KEYS_PROXY, ...KEYS_NO_PROXY]


/**
 * isolateExternal, 令本程序內axios(Node之http轉接器經proxy-from-env讀環境變數)之HTTP(S)請求一律經一個不通之代理, 只有127.0.0.1與localhost直連; 用於證明測試只取用本機樣本(任何對外請求即連線失敗, 與網路是否暢通無關)
 * 限制: 只截斷會讀代理環境變數之請求(axios之Node http轉接器); 直接用net、undici之fetch(預設不讀代理環境變數)者不受影響, 故只能據此宣稱「WDwloadFile經axios之請求不對外」, 不得宣稱程序整體零對外請求
 * 前提: 本機127.0.0.1之9埠無人監聽(連線即被拒); 使用者環境若設NODE_USE_ENV_PROXY=1(Node原生處理環境變數代理, 於程序啟動時快照), 此處之隔離不生效, api-sampleServer之isolateExternal案會因對外請求未被導向不通代理而轉紅(不會靜默通過)
 *
 * @returns {Function} 還原函數(恢復環境變數原值)
 */
function isolateExternal() {
    let proxy = 'http://127.0.0.1:9' //9為discard埠, 本機無人監聽, 連線即被拒
    let noProxy = '127.0.0.1,localhost'
    let kvs = ISOLATE_KEYS.map((k) => [k, KEYS_NO_PROXY.includes(k) ? noProxy : proxy])

    //先擷取全部舊值再寫入(Windows之環境變數名稱不分大小寫, 擷取與寫入交錯會把先寫入之代理值當成另一個大小寫之舊值而還原錯誤)
    let old = {}
    for (let [k] of kvs) {
        old[k] = process.env[k]
    }
    for (let [k, v] of kvs) {
        process.env[k] = v
    }
    return () => {
        for (let [k] of kvs) {
            if (old[k] === undefined) {
                delete process.env[k]
            }
            else {
                process.env[k] = old[k]
            }
        }
    }
}


export { startSampleServer, isolateExternal, ISOLATE_KEYS, SAMPLE }
