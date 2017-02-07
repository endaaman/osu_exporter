const fs = require('fs')
const path = require('path')
const sanitize = require("sanitize-filename")
const id3 = require('node-id3')


async function stat(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, function(err, stat) {
      if(!err) {
        resolve(stat)
        return
      }
      if(err.code == 'ENOENT') {
        resolve(false)
        return
      }
      reject(err)
    })
  })
}

async function writeFile(fileName, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, data, (err) => {
      if (err) {
        reject(err)
        return err
      }
      resolve()
    })
  })
}

const notFoundMap = []
const skippedMap = []

const RED = '\u001b[31m'
const RESET = '\u001b[0m'
const mapList = require('./track.json')
const DEST_DIR = './output'

async function copy(src, dest) {
  const stream = fs.createReadStream(src).pipe(fs.createWriteStream(dest))
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve();
    })
    stream.on('error', () => {
      reject();
    })
  })
}
let count = 0
async function main() {
  for (const i in mapList) {
    const m = mapList[i]
    const srcFilePath = path.join(m.mapDir, m.audioFile)
    if (await stat(srcFilePath) === false) {
      notFoundMap.push(m)
      console.log(`${RED}not exist: ${srcFilePath}${RESET}`)
      continue
    }
    if (!m.title || !m.artist || !m.audioFile || !m.mapDir) {
      skippedMap.push(m)
      console.log(`${RED}skippedMap: ${JSON.stringify(m, null, 2)}`)
      continue
    }
    const newFileName = sanitize(`${m.artist} - ${m.title}${path.extname(m.audioFile)}`)
    const destFilePath = path.join(DEST_DIR, newFileName)
    const srcStat = await stat(srcFilePath)
    const destStat = await stat(destFilePath)
    if (!destStat === false && srcStat.size > destStat.size) {
      await copy(srcFilePath, destFilePath)
    }
    id3.write({
      title: m.titleUnicode || m.title,
      artist: m.artistUnicode || m.artist,
      album: 'osu',
      genre: 'osu',
    }, destFilePath)
    console.log(newFileName)
    count = count + 1
  }

  await writeFile('./not_found.json', JSON.stringify(notFoundMap, null, 2))
  await writeFile('./skipped.json', JSON.stringify(skippedMap, null, 2))
}

main()
console.log(`Processed ${count} files`)
