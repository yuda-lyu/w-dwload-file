import fs from 'fs'
import net from 'net'
import http from 'http'
import path from 'path'
import crypto from 'crypto'
import assert from 'assert'
import axios from 'axios'
import { fileURLToPath } from 'url'
import { startSampleServer, isolateExternal, ISOLATE_KEYS, SAMPLE } from './tools/sampleServer.mjs'


//本機樣本服務(規則帳本R1)之自身測試: 樣本逐位元同原檔、服務只綁127.0.0.1並記錄請求、isolateExternal令axios之對外請求即失敗
//不連外網: 所有請求皆指向127.0.0.1; 對外請求之探測以RFC 5737之TEST-NET-1(192.0.2.1,文件用位址,不可路由)為目標, 且於不通代理下於本機即被拒絕

let dirTest = path.dirname(fileURLToPath(import.meta.url))


//以node之http取回應(不經axios, 使服務之測試不依賴被測之下載函式)
function request(url, method = 'GET') {
    return new Promise((resolve, reject) => {
        let req = http.request(url, { method }, (res) => {
            let chunks = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
        })
        req.on('error', reject)
        req.end()
    })
}


//canConnect, 該埠是否仍可連線
function canConnect(port) {
    return new Promise((resolve) => {
        let s = net.connect({ port, host: '127.0.0.1' })
        s.once('connect', () => {
            s.destroy()
            resolve(true)
        })
        s.once('error', () => {
            resolve(false)
        })
    })
}


describe('sampleServer', function() {

    it('fixture is byte-identical to the original sample', function() {

        //樣本即w-demores之res/video/aigen.mp4, 大小與sha256與jsDelivr上之檔相同(2026-11-25核對: 140769 bytes、3af7e794...b70b)
        let buf = fs.readFileSync(path.join(dirTest, 'fixtures', 'aigen.mp4'))
        assert.strict.deepEqual(buf.length, 140769)
        assert.strict.deepEqual(buf.length, SAMPLE.size)
        assert.strict.deepEqual(crypto.createHash('sha256').update(buf).digest('hex'), '3af7e7948cc66db55a9e42723e68d7854ba5ba37fb2c97a139f967efce69b70b')
        assert.strict.deepEqual(SAMPLE.sha256, '3af7e7948cc66db55a9e42723e68d7854ba5ba37fb2c97a139f967efce69b70b')

    })

    it('binds 127.0.0.1 only and serves the sample', async function() {
        let srv = await startSampleServer()
        try {

            //只綁127.0.0.1, 埠由作業系統配發(非0)
            assert.strict.deepEqual(srv.host, '127.0.0.1')
            assert.ok(/^http:\/\/127\.0\.0\.1:[1-9]\d*$/.test(srv.origin), `origin=${srv.origin}`)
            assert.strict.deepEqual(srv.urls.mp4, `${srv.origin}/video/aigen.mp4`)

            //GET: 200、長度標頭、內容逐位元同樣本
            let r = await request(srv.urls.mp4)
            assert.strict.deepEqual(r.status, 200)
            assert.strict.deepEqual(r.headers['content-length'], String(SAMPLE.size))
            assert.strict.deepEqual(r.headers['content-type'], 'video/mp4')
            assert.strict.deepEqual(crypto.createHash('sha256').update(r.body).digest('hex'), SAMPLE.sha256)

            //帶查詢字串仍視為同一路徑
            let r2 = await request(`${srv.urls.mp4}?x=1`)
            assert.strict.deepEqual(r2.status, 200)
            assert.strict.deepEqual(r2.body.length, SAMPLE.size)

            //HEAD: 200、有長度標頭、無本文
            let h = await request(srv.urls.mp4, 'HEAD')
            assert.strict.deepEqual(h.status, 200)
            assert.strict.deepEqual(h.headers['content-length'], String(SAMPLE.size))
            assert.strict.deepEqual(h.body.length, 0)

        }
        finally {
            await srv.close()
        }
    })

    it('answers unknown paths and methods with 404/405 and records every request', async function() {
        let srv = await startSampleServer()
        try {
            let a = await request(`${srv.origin}/npm/w-demores/res/video/aigen.mp4`) //未知路徑
            let b = await request(`${srv.origin}/video/aigen.mp4x`) //相近路徑不得誤中
            let c = await request(srv.urls.mp4, 'POST')
            let d = await request(srv.urls.mp4)
            assert.strict.deepEqual([a.status, b.status, c.status, d.status], [404, 404, 405, 200])
            assert.strict.deepEqual(srv.requests.map(v => `${v.method} ${v.url} ${v.status}`), [
                'GET /npm/w-demores/res/video/aigen.mp4 404',
                'GET /video/aigen.mp4x 404',
                'POST /video/aigen.mp4 405',
                'GET /video/aigen.mp4 200',
            ])
        }
        finally {
            await srv.close()
        }
    })

    it('close releases the port', async function() {
        let srv = await startSampleServer()
        let port = Number(new URL(srv.origin).port)
        assert.strict.deepEqual(await canConnect(port), true)
        await srv.close()
        assert.strict.deepEqual(await canConnect(port), false)
    })

    it('two servers use different ports (no fixed port)', async function() {
        let s1 = await startSampleServer()
        let s2 = await startSampleServer()
        try {
            assert.notStrictEqual(s1.origin, s2.origin)
        }
        finally {
            await s1.close()
            await s2.close()
        }
    })

})


describe('isolateExternal', function() {

    //所有被isolateExternal改寫之環境變數(含大小寫)
    let keys = ISOLATE_KEYS

    //對外請求之探測: 回傳錯誤物件(請求成功則回傳null)
    async function probe(url) {
        try {
            await axios.get(url, { timeout: 10000 })
        }
        catch (e) {
            return e
        }
        return null
    }

    it('diverts external requests of axios (http and https) to a dead proxy and keeps loopback direct', async function() {
        let srv = await startSampleServer()
        let restore = isolateExternal()
        try {

            //對外(TEST-NET-1)請求, http與https(原下載網址為https)皆: 於本機即連線被拒(連的是不通代理127.0.0.1:9, 不是目標), 與網路是否暢通無關
            for (let url of ['http://192.0.2.1/video/aigen.mp4', 'https://192.0.2.1/video/aigen.mp4']) {
                let err = await probe(url)
                assert.ok(err !== null, `external request should fail: ${url}`)
                let cause = err.cause || err
                assert.ok(cause.code === 'ECONNREFUSED', `${url} code=${cause.code}`)
                assert.ok(cause.address === '127.0.0.1' && cause.port === 9, `${url} address=${cause.address} port=${cause.port}`)
            }

            //同環境下對本機服務之請求直連、成功
            let res = await axios.get(srv.urls.mp4, { responseType: 'arraybuffer', timeout: 10000 })
            assert.strict.deepEqual(res.status, 200)
            assert.strict.deepEqual(crypto.createHash('sha256').update(res.data).digest('hex'), SAMPLE.sha256)

        }
        finally {
            restore()
            await srv.close()
        }
    })

    it('restores the original environment (set values and unset values)', function() {

        //預設各變數:一半設定特定值, 一半不設
        let saved = {}
        for (let k of keys) {
            saved[k] = process.env[k]
        }
        for (let k of keys) {
            delete process.env[k]
        }
        process.env.HTTPS_PROXY = 'http://127.0.0.1:8080'
        process.env.no_proxy = 'corp.invalid'
        let before = {}
        for (let k of keys) {
            before[k] = process.env[k]
        }

        let restore = null
        try {
            restore = isolateExternal()

            //啟用中: 代理指向不通之127.0.0.1:9, NO_PROXY只含本機
            assert.strict.deepEqual(process.env.HTTP_PROXY, 'http://127.0.0.1:9')
            assert.strict.deepEqual(process.env.HTTPS_PROXY, 'http://127.0.0.1:9')
            assert.strict.deepEqual(process.env.NO_PROXY, '127.0.0.1,localhost')

            restore()
            restore = null

            //還原: 原有值回復、原無值者仍無值(不得留空字串)
            for (let k of keys) {
                assert.strict.deepEqual(process.env[k], before[k], `${k} not restored`)
            }
        }
        finally {
            if (restore) {
                restore()
            }
            for (let k of keys) {
                if (saved[k] === undefined) {
                    delete process.env[k]
                }
                else {
                    process.env[k] = saved[k]
                }
            }
        }
    })

})
