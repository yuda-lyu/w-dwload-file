import rollupFiles from 'w-package-tools/src/rollupFiles.mjs'
import getFiles from 'w-package-tools/src/getFiles.mjs'


let fdSrc = './src'
let fdTar = './dist'


rollupFiles({
    fns: 'WDwloadFile.mjs',
    fdSrc,
    fdTar,
    // nameDistType: 'kebabCase',
    hookNameDist: () => {
        return 'w-dwload-file'
    },
    globals: {
        'fs': 'fs',
        'stream': 'stream',
    },
    external: [
        'fs',
        'stream',
    ],
})

