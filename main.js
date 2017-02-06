const fs = require('fs')
const path = require('path')
const osuParser = require('osu-parser')

const mapList = []

class TrackInfo {
  constructor(map, baseDir) {
    this.audioPath = path.join(baseDir, map.AudioFilename)
    this.title = map.Title
    this.titleUnicode  = map.TitleUnicode
    this.artist = map.Artist
    this.artistUnicode  = map.ArtistUnicode
  }
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

async function isDir(pathName) {
  return new Promise((resolve, reject) => {
    fs.lstat(pathName, (err, stat) => {
      if (err) {
        reject(err)
        return err
      }
      resolve(stat.isDirectory())
    })
  })
}


async function listDir(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        reject(err)
        return err
      }
      resolve(files)
    })
  })
}

async function parseOsuFile(pathName) {
  return new Promise((resolve, reject) => {
    osuParser.parseFile(pathName, function (err, beatmap) {
      if (err) {
        reject(err)
        return err
      }
      resolve(beatmap)
    })
  })
}

async function main() {
  const SOURCE_DIR = '/mnt/6t/osu/Songs'
  const DEST_FILE = './track.json'

  const mapDirs = await listDir(SOURCE_DIR)
  for (const i in mapDirs) {
    const mapDir = path.join(SOURCE_DIR, mapDirs[i])
    if (!await isDir(mapDir)) {
      continue
    }
    const files = await listDir(mapDir)
    for (const j in files) {
      const file = files[j]
      if (path.extname(file) === '.osu') {
        const beatmap = await parseOsuFile(path.join(mapDir, file))
        const info = new TrackInfo(beatmap, mapDir)
        mapList.push(info)
        console.log(`read: ${info.artistUnicode} - ${info.titleUnicode} `)
        break
      }
    }
  }
  console.log(`${mapList.length} tracks were read`)
  console.log(`writing json`)
  await writeFile(DEST_FILE, JSON.stringify(mapList, null, 2))
  console.log(`done`)
}

main()
