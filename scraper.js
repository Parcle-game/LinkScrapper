const axios = require("axios");
const fs = require("fs");

const GITHUB_TEXT_FILE_URL = "https://raw.githubusercontent.com/Parcle-game/LinkScrapper/refs/heads/main/links.txt";

// Roblox API Endpoints
const GetUniverseApi = "https://apis.roproxy.com/universes/v1/places/";
const GetGameDataApi = "https://games.roproxy.com/v1/games?universeIds=";

// Jam info object to include as extra data
const defaultInfo  = {
    "lastUpdated": new Date().toISOString(),
    "chalanceInfo": {
        "1": {
            "fullName": "Egg hunt games",
            "shortName": "Egg hunts",
            "Duration": "3 days",
            "Start": "07-02-2025 | 7 feb 2025 | 23:00 | 11 pm | 0",
            "End": "10-02-2025 | 10 feb 2025 | 23:00 | 11 pm | 0",
            "Description": "the developer chalange always is a weekend in february the time to show off your skills by making a game in one weekend",
            "Theme": "Break the system",
            "OGName": "EggHunts"
        },
        // add other jams if needed
    },
    "TotalGameJams": 1
};

async function scrapeTextFileForGameIDs(url) {
    try {
        const { data } = await axios.get(url);
        const regex = /https:\/\/www\.roblox\.com\/games\/(\d+)/g;
        const ids = new Set();
        let match;

        while ((match = regex.exec(data)) !== null) {
            ids.add(match[1]);
        }

        console.log(`Found ${ids.size} unique game IDs`);
        return Array.from(ids);
    } catch (error) {
        console.error("Failed to fetch or parse text file:", error.message);
        return [];
    }
}

async function getUniverseID(placeID) {
    try {
        const res = await axios.get(`${GetUniverseApi}${placeID}/universe`);
        return res.data.universeId;
    } catch (error) {
        console.warn(`Failed to get Universe ID for ${placeID}: ${error.message}`);
        return null;
    }
}

async function getGameData(universeID) {
    try {
        const res = await axios.get(`${GetGameDataApi}${universeID}`);
        return res.data.data?.[0] || null;
    } catch (error) {
        console.warn(`Failed to get game data for Universe ${universeID}: ${error.message}`);
        return null;
    }
}

async function main() {
    const placeIDs = await scrapeTextFileForGameIDs(GITHUB_TEXT_FILE_URL);
    const result = {};
    let index = 1;

    for (const placeID of placeIDs) {
        const universeID = await getUniverseID(placeID);
        if (!universeID) continue;

        const gameInfo = await getGameData(universeID);
        if (!gameInfo) continue;

        result[index] = {
            placeID,
            universeID,
            gameData: {
                title: gameInfo.name || "Unknown",
                description: gameInfo.description || "No description",
                stats: {
                    Playing: gameInfo.playing || 0,
                    Visits: gameInfo.visits || 0,
                    Favorited: gameInfo.favoritedCount || 0
                },
                attributes: {
                    Created: gameInfo.created || "Unknown",
                    Updated: gameInfo.updated || "Unknown",
                    Genre: gameInfo.genre || "All",
                    MaxPlayers: gameInfo.maxPlayers || 0
                },
                Creator: {
                    Name: gameInfo.creator?.name || "Unknown",
                    ID: gameInfo.creator?.id || 0,
                    Type: gameInfo.creator?.type || "Unknown"
                }
            }
        };

        console.log(`✔ Saved data for ${gameInfo.name}`);
        index++;
    }

    // Add jam info as an extra top-level property
    const finalOutput = {
        games: result,
        defaultData: defaultInfo 
    };

    fs.writeFileSync("game_data.json", JSON.stringify(finalOutput, null, 2));
    console.log("✅ All data saved to game_data.json");
}

main();
