package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/mikkyang/id3-go"
)

// MapInfo contains title, artist and filename of the trac
type MapInfo struct {
	title    string
	artist   string
	filename string
}

func copyFile(src, dest string) {
	content, err := ioutil.ReadFile(src)
	if err != nil {
		panic(err)
	}
	err = ioutil.WriteFile(dest, content, 0644)
	if err != nil {
		panic(err)
	}
}

func escapeForPathname(text string) string {
	return strings.Replace(text, "/", "", -1)
}

var regTitle = regexp.MustCompile(`Title:(.*)[\r]+`)
var regTitleUnicode = regexp.MustCompile(`TitleUnicode:(.*)[\r]+`)
var regArtist = regexp.MustCompile(`Artist:(.*)[\r]+`)
var regArtistUnicode = regexp.MustCompile(`ArtistUnicode:(.*)[\r]+`)
var regAudioFilename = regexp.MustCompile(`AudioFilename: (.*)[\r]+`)

func regTest(reg, text string) bool {
	return regexp.MustCompile(reg).MatchString(text)
}

func parseLine(reg *regexp.Regexp, line string) (bool, string) {
	res := reg.FindStringSubmatch(line)
	if len(res) == 2 {
		return true, res[1]
	}
	return false, ""
}

func parseOsuFile(osuFile string) MapInfo {
	mapInfo := MapInfo{}
	m, titleUnicode := parseLine(regTitleUnicode, osuFile)
	if m {
		mapInfo.title = titleUnicode
	} else {
		_, mapInfo.title = parseLine(regTitle, osuFile)
	}

	m, artistUnicode := parseLine(regArtistUnicode, osuFile)
	if m {
		mapInfo.artist = artistUnicode
	} else {
		_, mapInfo.artist = parseLine(regArtist, osuFile)
	}

	m, audioFilename := parseLine(regAudioFilename, osuFile)
	if m {
		mapInfo.filename = audioFilename
	}
	return mapInfo
}

func generateFilemap(osuSongsDir string) {
	mapList, err := ioutil.ReadDir(osuSongsDir)
	if err != nil {
		panic(err)
	}
	count := 0
	for _, mapDir := range mapList {
		if !mapDir.IsDir() {
			continue
		}
		if !regTest(`^[0-9]* `, mapDir.Name()) {
			continue
		}
		list, err := ioutil.ReadDir(path.Join(osuSongsDir, mapDir.Name()))
		if err != nil {
			panic(err)
		}
		osuFile := ""
		for _, mapFile := range list {
			if regTest(`\.osu$`, mapFile.Name()) {
				osuFile = mapFile.Name()
			}
		}
		if osuFile == "" {
			continue
		}

		mapDirName := path.Join(osuSongsDir, mapDir.Name())
		buffer, err := ioutil.ReadFile(path.Join(mapDirName, osuFile))
		if err != nil {
			panic(err)
		}
		mapInfo := parseOsuFile(string(buffer))

		sourcePath := path.Join(mapDirName, mapInfo.filename)
		sourcePathInfo, err := os.Stat(sourcePath)
		count = count + 1
		if err != nil {
			continue
		}
		if sourcePathInfo.IsDir() {
			continue
		}

		dirname, _ := filepath.Abs("./")
		outputPath := path.Join(dirname, "output", escapeForPathname(mapInfo.artist)+" - "+escapeForPathname(mapInfo.title)+mapInfo.filename[strings.LastIndex(mapInfo.filename, "."):])

		copyFile(sourcePath, outputPath)

		mp3File, _ := id3.Open(outputPath)
		mp3File.SetArtist(mapInfo.artist)
		mp3File.SetTitle(mapInfo.title)
		mp3File.SetGenre("Other")
		mp3File.SetAlbum("osu!")
		mp3File.Close()
	}
	fmt.Println(count)
}
func main() {
	generateFilemap("/mnt/6t/osu/Songs")
}
