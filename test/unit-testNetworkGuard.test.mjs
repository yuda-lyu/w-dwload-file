import fs from 'fs'
import path from 'path'
import assert from 'assert'
import { fileURLToPath } from 'url'


//測試不連外網之靜態守門(規則帳本R1): 掃描測試與工具之原始碼, 守住「樣本由本機服務供應」
//限制: 只做原始碼之文字掃描, 不證明執行時零對外請求(執行時之截斷見api-sampleServer之isolateExternal)

let dirTest = path.dirname(fileURLToPath(import.meta.url))
let dirRoot = path.dirname(dirTest)
let selfPath = fileURLToPath(import.meta.url)

//列出test/下全部原始碼(遞迴; .mjs、.cjs、.js; 略過夾具、暫存與證據夾); 本檔自身含有判準之字樣, 不納入掃描
function listSources(dir = dirTest) {
    let r = []
    for (let ent of fs.readdirSync(dir, { withFileTypes: true })) {
        let fp = path.join(dir, ent.name)
        if (ent.isDirectory()) {
            if (!['fixtures', '_tmp', 'pics'].includes(ent.name)) {
                r.push(...listSources(fp))
            }
        }
        else if (/\.(mjs|cjs|js)$/.test(ent.name) && fp !== selfPath) {
            r.push(fp)
        }
    }
    return r
}

function read(fp) {
    return fs.readFileSync(fp, 'utf8')
}

//允許之網址主機: 本機, 以及RFC 5737之TEST-NET-1(192.0.2.x, 文件用位址, 不可路由; 只在api-sampleServer作為「對外請求」之探測目標)
function isAllowedHost(host) {
    return host === '127.0.0.1' || host === 'localhost' || /^192\.0\.2\.\d+$/.test(host)
}


describe('testNetworkGuard', function() {

    it('scans the expected sources', function() {
        //掃描範圍須含主測試檔與工具, 否則下列掃描為空而恆通過
        let names = listSources().map(v => path.basename(v))
        assert.ok(!names.includes('unit-testNetworkGuard.test.mjs'), 'self should not be scanned')
        assert.ok(names.includes('WDwloadFile.test.mjs'), 'WDwloadFile.test.mjs not scanned')
        assert.ok(names.includes('sampleServer.mjs'), 'sampleServer.mjs not scanned')
        assert.ok(names.includes('api-sampleServer.test.mjs'), 'api-sampleServer.test.mjs not scanned')
    })

    it('tests and tools contain no CDN domain', function() {
        //測試與工具不得出現CDN/套件庫網域(原jsDelivr下載已改本機供應)
        let re = /jsdelivr\.net|unpkg\.com|cdnjs\.|githubusercontent\.com|npmjs\.(com|org)/i
        let bad = []
        for (let fp of listSources()) {
            let m = re.exec(read(fp))
            if (m) {
                bad.push(`${path.basename(fp)}: ${m[0]}`)
            }
        }
        assert.ok(bad.length === 0, `CDN domain found: ${bad.join('; ')}`)
    })

    it('tests and tools contain no non-local URL', function() {
        //任何http(s)網址之主機須為本機(或文件用位址); 樣板字串內以${...}組成者(如本機服務之origin)略過
        let bad = []
        for (let fp of listSources()) {
            let src = read(fp)
            let re = /https?:\/\/([^\s/'"`:?#\\]+)/g
            let m
            while ((m = re.exec(src)) !== null) {
                let host = m[1]
                if (host.startsWith('$')) {
                    continue
                }
                if (!isAllowedHost(host)) {
                    bad.push(`${path.basename(fp)}: ${host}`)
                }
            }
        }
        assert.ok(bad.length === 0, `non-local URL found: ${bad.join('; ')}`)
    })

    it('every test file that calls WDwloadFile uses the local sample server and the external isolation', function() {

        //真跑主函數(WDwloadFile( 之呼叫,排除import行)之測試檔, 逐檔須:匯入本機服務、啟動它、啟用隔離、網址取自本機服務
        let hits = []
        for (let fp of listSources()) {
            if (!/\.test\.(mjs|cjs|js)$/.test(fp)) {
                continue
            }
            let src = read(fp)
            let body = src.split('\n').filter(v => !/^\s*import\s/.test(v) && !/^\s*\/\//.test(v)).join('\n')
            if (!/(^|[^.\w])WDwloadFile\(/m.test(body)) {
                continue
            }
            hits.push(path.basename(fp))
            let name = path.basename(fp)
            assert.ok(/import\s*\{[^}]*\bstartSampleServer\b[^}]*\}\s*from\s*'\.\/tools\/sampleServer\.mjs'/.test(src), `${name}: startSampleServer not imported`)
            assert.ok(/import\s*\{[^}]*\bisolateExternal\b[^}]*\}\s*from\s*'\.\/tools\/sampleServer\.mjs'/.test(src), `${name}: isolateExternal not imported`)
            assert.ok(/await\s+startSampleServer\(\)/.test(body), `${name}: startSampleServer() not awaited`)
            assert.ok(/isolateExternal\(\)/.test(body), `${name}: isolateExternal() not called`)
            assert.ok(/WDwloadFile\(\s*url\b/.test(body) && /\burl\s*=\s*server\.urls\./.test(body), `${name}: the url is not taken from the local server`)
            assert.ok(/\bserver\.close\(\)/.test(body), `${name}: the local server is not closed`)
            assert.ok(/\brestore\(\)/.test(body), `${name}: the isolation is not restored`)
        }

        //至少有主測試檔, 否則掃描失效(恆通過)
        assert.ok(hits.includes('WDwloadFile.test.mjs'), `hits=${hits.join(',')}`)

    })

    it('the sample is a local fixture and README states the network needs', function() {
        assert.ok(fs.existsSync(path.join(dirTest, 'fixtures', 'aigen.mp4')), 'test/fixtures/aigen.mp4 missing')

        //README之〈測試之網路需求〉節(切到下一個二級標題前)
        let readme = read(path.join(dirRoot, 'README.md'))
        let i = readme.indexOf('## 測試之網路需求')
        assert.ok(i >= 0, 'README lacks the section 測試之網路需求')
        let rest = readme.slice(i + 1)
        let j = rest.search(/\n## /)
        let sec = j < 0 ? rest : rest.slice(0, j)
        for (let w of ['不需外網', 'test/tools/sampleServer.mjs', 'test/fixtures/aigen.mp4', '127.0.0.1']) {
            assert.ok(sec.includes(w), `README section lacks: ${w}`)
        }
    })

})
