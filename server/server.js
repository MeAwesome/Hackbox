const express = require("express");
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const next = require('next');
const fs = require('fs-extra');
const path = require('path');
const sharp = require("sharp");
const proxy = require('express-http-proxy');
const ifaces = require('os').networkInterfaces();
let address;

Object.keys(ifaces).forEach(dev => {
    ifaces[dev].filter(details => {
        if (details.family === 'IPv4' && details.internal === false && details.address.indexOf("192.168") > -1) {
            address = details.address;
        }
    });
});

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function start() {
    console.clear();
    console.log("Jackbox Server Booting");
    await readConfig();
    await prepareNextjs();
    await hostWebsite();
    console.log("Jackbox Server Available");
}

function readConfig() {
    return new Promise(async (resolve, reject) => {
        console.log("Reading jackbox-config.json...");
        var configFilePath = "./server/jackbox-config.json";
        try {
            await fs.access(configFilePath);
            console.log("Config File Exists");
        } catch (configError) {
            try {
                console.log("! Config File Does Not Exist !");
                await fs.copyFile("./server/jackbox-config-default.json", configFilePath);
                console.log("Config File Created");
            } catch (defaultConfigError) {
                console.log("! Default Config File Does Not Exist !");
                reject("Configuration Error");
            }
        }
        try {
            var configFile = await fs.readFile(configFilePath);
            console.log("Config Is Being Parsed");
            JSON.parse(configFile);
            resolve();
        } catch (error) {
            console.log(error);
        }
        resolve();
    });
}

function prepareNextjs() {
    return new Promise(async (resolve, reject) => {
        console.log("Preparing Next.js...");
        await app.prepare();
        console.log("Next.js is ready!");
        resolve();
    });
}

function modifyGame(gameName, gameContent, modContent) {
    return new Promise(async (resolve, reject) => {
        switch (gameName) {
            case "Talking Points":
                var availableImages = await fs.readdir(modContent);
                var originalImages = await fs.readdir(path.join(gameContent, "JackboxTalksPicture"));
                var numberOfImages = originalImages.length;
                var numberOfModImages = availableImages.length;
                var id = 0;
                console.log(Math.min(numberOfImages, numberOfModImages));
                for (var image = 0; image < Math.min(numberOfImages, numberOfModImages); image++) {
                    var randomIndex = Math.floor(Math.random() * availableImages.length);
                    var randomImage = availableImages[randomIndex];
                    if ([".jpeg", ".jpg", ".png", ".webp", ".svg"].includes(path.extname(randomImage))){
                        availableImages.splice(randomIndex, 1);
                        await sharp(path.join(modContent, randomImage))
                            .resize(1485, 990)
                            .toFormat('jpeg')
                            .jpeg({
                                quality: 100,
                                chromaSubsampling: '4:4:4',
                                force: true
                            })
                            .toFile(path.join(gameContent, "JackboxTalksPicture", originalImages[id]));
                        await sharp(path.join(modContent, randomImage))
                            .resize(768, 512)
                            .toFormat('jpeg')
                            .jpeg({
                                quality: 100,
                                chromaSubsampling: '4:4:4',
                                force: true
                            })
                            .toFile(path.join(gameContent, "JackboxTalksPictureLow", originalImages[id]));
                        id++;
                    } else {
                        console.log("invalid image type");
                        image--;
                    }
                }
                break;
            default:
                break;
        }
        resolve();
    });
}

function hostWebsite() {
    return new Promise(async (resolve, reject) => {
        const server = express();

        server.post("/mod/config/update", jsonParser, async (req, res) => {
            var config = {
                gamesDirectory: path.normalize(req.body.gamesDirectory),
                imagesDirectory: path.normalize(req.body.imagesDirectory)
            };
            if (config.gamesDirectory == ".") {
                config.gamesDirectory = "";
            }
            if (config.imagesDirectory == ".") {
                config.imagesDirectory = "";
            }
            await fs.writeFile("./server/jackbox-config.json", JSON.stringify(config));
            res.end();
        });

        server.use("/mod/config", async (req, res) => {
            var configFile = await fs.readFile("./server/jackbox-config.json");
            res.json(JSON.parse(configFile));
        });

        server.post("/mod/enable", async (req, res) => {
            var configFile = await fs.readFile("./server/jackbox-config.json");
            var config = JSON.parse(configFile);
            var gamesFile = await fs.readFile("./server/jackbox-games.json");
            var games = JSON.parse(gamesFile);
            var allGamesDirectories = (await fs.readdir(config.gamesDirectory, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
            var allImagesDirectories = (await fs.readdir(config.imagesDirectory, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
            var packsToMod = allGamesDirectories.filter(p => allImagesDirectories.includes(p));
            for (var pack = 0; pack < packsToMod.length; pack++) {
                var gamesInPack = (await fs.readdir(path.join(config.gamesDirectory, packsToMod[pack], "games"), { withFileTypes: true }))
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => ((games[dirent.name]) ? games[dirent.name] : dirent.name));
                var gamesWithMods = (await fs.readdir(path.join(config.imagesDirectory, packsToMod[pack]), { withFileTypes: true }))
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => ((games[dirent.name]) ? games[dirent.name] : dirent.name));
                var gamesToMod = gamesInPack.filter(g => gamesWithMods.includes(g));
                for (var game = 0; game < gamesToMod.length; game++) {
                    var originalName = Object.keys(games).find(key => games[key] === gamesToMod[game]);
                    var contentDirectory = path.join(config.gamesDirectory, packsToMod[pack], "games", originalName, "content");
                    var originalDirectory = path.join(config.gamesDirectory, packsToMod[pack], "games", originalName, "original-content");
                    var modImages = path.join(config.imagesDirectory, packsToMod[pack], gamesToMod[game]);
                    if (fs.existsSync(originalDirectory)) {
                        console.log("Removing previous content");
                        await fs.rm(contentDirectory, { recursive: true });
                        console.log("Importing original content");
                        await fs.copy(originalDirectory, contentDirectory);
                    } else {
                        console.log("Copying original content of", gamesToMod[game]);
                        await fs.copy(contentDirectory, originalDirectory);
                    }
                    console.log("Modifying", gamesToMod[game]);
                    await modifyGame(gamesToMod[game], contentDirectory, modImages);
                }
            }
            res.sendStatus(200);
        });

        server.post("/mod/disable", async (req, res) => {
            var configFile = await fs.readFile("./server/jackbox-config.json");
            var config = JSON.parse(configFile);
            var gamesFile = await fs.readFile("./server/jackbox-games.json");
            var games = JSON.parse(gamesFile);
            var allGamesDirectories = (await fs.readdir(config.gamesDirectory, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
            var allImagesDirectories = (await fs.readdir(config.imagesDirectory, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
            var packsToMod = allGamesDirectories.filter(p => allImagesDirectories.includes(p));
            for (var pack = 0; pack < packsToMod.length; pack++) {
                var gamesInPack = (await fs.readdir(path.join(config.gamesDirectory, packsToMod[pack], "games"), { withFileTypes: true }))
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => ((games[dirent.name]) ? games[dirent.name] : dirent.name));
                var gamesWithMods = (await fs.readdir(path.join(config.imagesDirectory, packsToMod[pack]), { withFileTypes: true }))
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => ((games[dirent.name]) ? games[dirent.name] : dirent.name));
                var gamesToMod = gamesInPack.filter(g => gamesWithMods.includes(g));
                for (var game = 0; game < gamesToMod.length; game++) {
                    var originalName = Object.keys(games).find(key => games[key] === gamesToMod[game]);
                    var contentDirectory = path.join(config.gamesDirectory, packsToMod[pack], "games", originalName, "content");
                    var originalDirectory = path.join(config.gamesDirectory, packsToMod[pack], "games", originalName, "original-content");
                    if (fs.existsSync(originalDirectory)) {
                        console.log("Removing previous content");
                        await fs.rm(contentDirectory, { recursive: true });
                        console.log("Importing original content");
                        await fs.copy(originalDirectory, contentDirectory);
                    } else {
                        console.error("Could not restore: no original directory");
                    }
                }
            }
            res.sendStatus(200);
        });

        server.use("/jackbox/settings", (req, res) => {
            res.redirect("/settings");
        });

        server.get("/jackbox/customimages/:pack/:game/css", async (req, res) => {
            var cssPath = path.join(__dirname, "..", "styles", req.params.game + ".css")
            try {
                await fs.access(cssPath);
            } catch (noCss) {
                await fs.writeFile(cssPath, "");
            }
            var configFile = await fs.readFile("./server/jackbox-config.json");
            var config = JSON.parse(configFile);
            var gamesFile = await fs.readFile("./server/jackbox-games.json");
            var games = JSON.parse(gamesFile);
            var jackboxName = req.params.game.split("-");
            var jackboxName = jackboxName.map(element => {
                return element.charAt(0).toUpperCase() + element.substring(1).toLowerCase();
            });
            jackboxName = jackboxName.join("");
            var originalName = games[jackboxName];
            var pack = "The Jackbox Party Pack " + req.params.pack;
            if (originalName == "Talking Points") {
                var originalImages = await fs.readdir(path.join(config.gamesDirectory, pack, "games", jackboxName, "content", "JackboxTalksPicture"));
                var ids = originalImages.map(image => {
                    return image.replace(".jpg", "");
                });
                for (var id = 0; id < ids.length; id++) {
                    await fs.appendFile(cssPath, `.jackbox-talks .Slideshow .photo-${ids[id]}-thumb,
.jackbox-talks .Draw.photo-${ids[id]}-thumb canvas.sketchpad,
.jackbox-talks .Awards .photo.photo-${ids[id]}-thumb,
.jackbox-talks .photo.photo-${ids[id]}-thumb .choice-button {
    background-image: url(/jackbox/customimages/7/jackbox-talks/${ids[id]}/1) !important
}

`);
                }
                res.sendFile(cssPath);
            }
        });

        server.use("/jackbox/customimages/:pack/:game/:id/:version", async (req, res) => {
            var configFile = await fs.readFile("./server/jackbox-config.json");
            var config = JSON.parse(configFile);
            var gamesFile = await fs.readFile("./server/jackbox-games.json");
            var games = JSON.parse(gamesFile);
            var jackboxName = req.params.game.split("-");
            var jackboxName = jackboxName.map(element => {
                return element.charAt(0).toUpperCase() + element.substring(1).toLowerCase();
            });
            jackboxName = jackboxName.join("");
            var originalName = games[jackboxName];
            var pack = "The Jackbox Party Pack " + req.params.pack;
            if (originalName == "Talking Points") {
                if (req.params.version == 0) {
                    res.sendFile(path.join(config.gamesDirectory, pack, "games", jackboxName, "content", "JackboxTalksPicture", req.params.id + ".jpg"));
                } else if (req.params.version == 1) {
                    res.sendFile(path.join(config.gamesDirectory, pack, "games", jackboxName, "content", "JackboxTalksPictureLow", req.params.id + ".jpg"));
                }
            }
        });

        server.use("/jackbox", proxy("https://jackbox.tv"));

        server.all("*", (req, res) => {
            return handle(req, res);
        });

        server.listen(3434, async () => {
            console.log("Jackbox Website Available");
            console.log(address + ":3434");
            resolve();
        });
    });
}

start();