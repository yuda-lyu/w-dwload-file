import fs from 'fs'
import assert from 'assert'
import WDwloadFile from '../src/WDwloadFile.mjs'


function isWindows() {
    return process.platform === 'win32'
}


describe('WDwloadFile', function() {

    //check
    if (!isWindows()) {
        return
    }

    async function test() {

        //url
        let url = `https://cdn.jsdelivr.net/npm/w-demores@1.0.28/res/video/aigen.mp4`

        //fp
        let fp = './test/abc.mp4'

        //funProg
        let funProg = (prog, nn, na) => {
            //console.log('prog', `${prog.toFixed(2)}%`, nn, na)
        }

        //WDwloadFile
        await WDwloadFile(url, fp, {
            clean: true, //單一程序執行時, 事先清除之前暫存檔, 減少浪費硬碟空間
            funProg,
        })

        //len
        let len = fs.statSync(fp).size
        // console.log('len', len)

        //unlinkSync
        fs.unlinkSync(fp)

        return len
    }
    // test()
    //     .catch((err) => {
    //         console.log('catch', err)
    //     })

    it('download', async function() {
        let r = 140769
        let rr = await test()
        assert.strict.deepEqual(r, rr)
    })

})
