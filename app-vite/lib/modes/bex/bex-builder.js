import { join } from 'node:path'
import fse from 'fs-extra'
import archiver from 'archiver'

import { AppBuilder } from '../../app-builder.js'
import { progress } from '../../utils/logger.js'
import { quasarBexConfig } from './bex-config.js'
import { createManifest, copyBexAssets } from './bex-utils.js'

export class QuasarModeBuilder extends AppBuilder {
  async build () {
    const viteConfig = await quasarBexConfig.vite(this.quasarConf)
    await this.buildWithVite('BEX UI', viteConfig)

    const { err, scriptList } = createManifest(this.quasarConf)
    if (err !== void 0) process.exit(1)

    for (const entry of scriptList) {
      const contentConfig = await quasarBexConfig.bexScript(this.quasarConf, entry)
      await this.buildWithEsbuild(`Bex Script (${ entry.name })`, contentConfig)
    }

    copyBexAssets(this.quasarConf)

    this.printSummary(this.quasarConf.build.distDir)
    this.#bundlePackage(this.quasarConf.build.distDir)
  }

  #bundlePackage (dir) {
    const done = progress('Bundling in progress...')
    const zipName = `Packaged.${ this.ctx.pkg.appPkg.name }.zip`
    const file = join(dir, zipName)

    const output = fse.createWriteStream(file)
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })

    archive.pipe(output)
    archive.directory(dir, false, entryData => ((entryData.name !== zipName) ? entryData : false))
    archive.finalize()

    done(`Bundle has been generated at: ${ file }`)
  }
}
