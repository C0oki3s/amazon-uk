const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Store location data for each guild as an array of locations
const locationData = new Map();

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Handle !setlocation command
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith("!setlocation")) return;

  const args = message.content.split(" ").slice(1);
  if (args.length === 0) {
    return message.reply(
      "Please provide a location, e.g., `!setlocation Luton`"
    );
  }

  const location = args.join(" ");
  try {
    // Fetch geolocation data
    const geoData = await fetchGeoData(location);
    if (!geoData || !geoData.data.queryGeoInfoByAddress[0]) {
      return message.reply("Could not find location data for " + location);
    }

    const geoInfo = geoData.data.queryGeoInfoByAddress[0];
    const guildId = message.guild.id;

    // Initialize or update location array for the guild
    let locations = locationData.get(guildId) || [];
    const existingLocation = locations.find(
      (loc) => loc.locationName.toLowerCase() === location.toLowerCase()
    );
    if (!existingLocation) {
      locations.push({
        country: geoInfo.country === "GBR" ? "United Kingdom" : geoInfo.country,
        lat: geoInfo.lat,
        lng: geoInfo.lng,
        locationName: location,
      });
      locationData.set(guildId, locations);
    } else {
      // Update existing location
      existingLocation.country =
        geoInfo.country === "GBR" ? "United Kingdom" : geoInfo.country;
      existingLocation.lat = geoInfo.lat;
      existingLocation.lng = geoInfo.lng;
    }

    // Create or find channel
    let channel = message.guild.channels.cache.find(
      (ch) => ch.name === `jobs-${location.toLowerCase().replace(/\s+/g, "-")}`
    );

    if (!channel) {
      channel = await message.guild.channels.create({
        name: `jobs-${location.toLowerCase().replace(/\s+/g, "-")}`,
        type: ChannelType.GuildText, // Corrected from ChannelSTER_GuildText
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
          },
        ],
      });
    }

    // Fetch job data for the new or updated location
    const jobData = await fetchData(guildId, location);
    if (jobData && jobData.jobDetails.length > 0) {
      if (!checkAndUpdateFile(jobData.jobDetails)) {
        await channel.send(jobData.message);
        await message.reply(`Job listings for ${location} sent to ${channel}`);
      } else {
        await message.reply(
          "Message limit exceeded for this location in the last 6 hours."
        );
      }
    } else {
      await message.reply("No job listings found for " + location);
    }
  } catch (error) {
    console.error("Error handling command:", error);
    await message.reply("An error occurred while processing your request.");
  }
});

// Fetch geolocation data
const fetchGeoData = async (address) => {
  const query = `
    query queryGeoInfoByAddress($geoAddressQueryRequest: GeoAddressQueryRequest!) {
      queryGeoInfoByAddress(geoAddressQueryRequest: $geoAddressQueryRequest) {
        country
        lat
        lng
        postalCode
        label
        municipality
        region
        subRegion
        addressNumber
        __typename
      }
    }
  `;

  const variables = {
    geoAddressQueryRequest: {
      address,
      countries: ["GBR"],
    },
  };

  try {
    const response = await axios.post(
      "https://qy64m4juabaffl7tjakii4gdoa.appsync-api.eu-west-1.amazonaws.com/graphql",
      { query, variables },
      {
        headers: {
          Accept: "*/*",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          Authorization:
            "Bearer Status|unauthenticated|Session|eyJhbGciOiJLTVMiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE3NDYwMjg3ODIsImV4cCI6MTc0NjAzMjM4Mn0.AQICAHh9Y3eh+eSawH7KZrCzIFETq1dycngugjOljT8N4eCxVgEP5iS/k7DF9QqH0sSmAd21AAAAtDCBsQYJKoZIhvcNAQcGoIGjMIGgAgEAMIGaBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDDJyCCz3/B/6xeZVUgIBEIBt80xrTJYoQFA/JjHFM1CsM49D8we2NpTemkk+Spu1Y1qCHKNEByJRclNfPkVY7dLEwxS4OFcQDDqmvres7NAtZGngGE+FMgrgthYkCGcuXs/cOgb+9swbHoLfJLDXAq2C1o4vqMw0TPErdJo2Aw==",
          "Content-Type": "application/json",
          country: "United Kingdom",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching geo data:", error);
    return null;
  }
};

// Fetch job data for a specific location
const fetchData = async (guildId, locationName) => {
  const locations = locationData.get(guildId) || [];
  const location = locations.find(
    (loc) => loc.locationName.toLowerCase() === locationName.toLowerCase()
  ) || {
    country: "United Kingdom",
    lat: 51.924491609412,
    lng: -0.487100640539,
    locationName: "Unknown",
  };

  const query = `
    query searchJobCardsByLocation($searchJobRequest: SearchJobRequest!) {
      searchJobCardsByLocation(searchJobRequest: $searchJobRequest) {
        nextToken
        jobCards {
          jobId
          language
          dataSource
          requisitionType
          jobTitle
          jobType
          employmentType
          city
          state
          postalCode
          locationName
          totalPayRateMin
          totalPayRateMax
          tagLine
          bannerText
          image
          jobPreviewVideo
          distance
          featuredJob
          bonusJob
          bonusPay
          scheduleCount
          currencyCode
          geoClusterDescription
          surgePay
          jobTypeL10N
          employmentTypeL10N
          bonusPayL10N
          surgePayL10N
          totalPayRateMinL10N
          totalPayRateMaxL10N
          distanceL10N
          monthlyBasePayMin
          monthlyBasePayMinL10N
          monthlyBasePayMax
          monthlyBasePayMaxL10N
          jobContainerJobMetaL1
          virtualLocation
          poolingEnabled
        }
      }
    }
  `;

  const variables = {
    searchJobRequest: {
      locale: location.country === "United Kingdom" ? "en-GB" : "en-US",
      country: location.country,
      keyWords: "",
      geoQueryClause: {
        lat: location.lat,
        lng: location.lng,
        unit: "mi",
        distance: 30,
      },
      equalFilters: [],
      consolidateSchedule: true,
      containFilters: [
        {
          key: "isPrivateSchedule",
          val: ["true", "false"],
        },
      ],
      dateFilters: [],
      orFilters: [],
      pageSize: 100,
      rangeFilters: [],
      sorters: [
        {
          fieldName: "totalPayRateMax",
          ascending: false,
        },
      ],
    },
  };

  try {
    const response = await axios.post(
      "https://qy64m4juabaffl7tjakii4gdoa.appsync-api.eu-west-1.amazonaws.com/graphql",
      { query, variables },
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          Authorization:
            "Status|unauthenticated|Session|eyJhbGciOiJLTVMiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE3MTY1ODIyOTUsImV4cCI6MTcxNjU4NTg9NX0.AQICAHj70Se3MiDcPzFAaBWEUnkjrGmzv9g3W3mMwfMWM31A0QF4t9bpC4haT1wU7TGAPhXsAAAAtDCBsQYJKoZIhvcNAQcGoIGjMIGgAgEAMIGaBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDIZ0EcLVvQgBNFdG8gIBEIBtKi8Jghj3/n5iOm52n7CJo8VlW1L7I4Td/u5xIZQFnJXnnlCk8jIQ5jc9sH6gclsFign0U9Upc56kyiaOAXOzWdoK0BqNKe02ngCucNafG/DXVubiA62K5ixppaGf29DJnzU1eEpON/i9VPjm7w==",
          "Content-Type": "application/json; charset=UTF-8",
          Country: "United Kingdom",
          Iscanary: "false",
          Origin: "https://www.jobsatamazon.co.uk",
          Referer: "https://www.jobsatamazon.co.uk/",
          "Sec-Ch-Ua":
            '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "X-Amz-User-Agent": "aws-amplify/5.3.13 api/1 framework/0",
        },
      }
    );

    const data = response.data;
    const jobDetails = data?.data?.searchJobCardsByLocation?.jobCards
      .map((job) => ({
        jobId: job.jobId,
        jobTitle: job.jobTitle,
        locationName: job.locationName,
        city: job.city,
        state: job.state,
        postalCode: job.postalCode,
        employmentType: job.employmentType,
        employmentTypeL10N: job.employmentTypeL10N,
        jobType: job.jobType,
        jobTypeL10N: job.jobTypeL10N,
        totalPayRateMin: job.totalPayRateMin,
        totalPayRateMax: job.totalPayRateMax,
        currencyCode: job.currencyCode,
      }))
      .filter((job) => job.jobTitle !== "Remote Customer Service Associate");

    let message = `**New Job Listings in ${location.locationName}**\n\n`;
    jobDetails.forEach((detail, index) => {
      message += `**${index + 1}. ${detail.jobTitle}**\n`;
      message += `Location: ${detail.locationName}, ${detail.city}, ${detail.state}, ${detail.postalCode}\n`;
      message += `Employment Type: ${
        detail.employmentTypeL10N || detail.employmentType
      }\n`;
      message += `Job Type: ${detail.jobTypeL10N || detail.jobType}\n`;
      message += `Pay: ${detail.currencyCode} ${detail.totalPayRateMin} - ${detail.totalPayRateMax}\n`;
      message += `---\n`;
    });

    return { message, jobDetails };
  } catch (error) {
    console.error(
      "Error fetching job data for",
      location.locationName,
      ":",
      error
    );
    return null;
  }
};

// Check and update job counts file
const checkAndUpdateFile = (jobDetails) => {
  const filePath = path.resolve(__dirname, "job_counts.json");
  const now = new Date();
  let jobCounts = {};

  if (fs.existsSync(filePath)) {
    jobCounts = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  let exceeded = false;

  jobDetails.forEach((job) => {
    if (!jobCounts[job.postalCode]) {
      jobCounts[job.postalCode] = [];
    }
    // Filter out timestamps older than 6 hours
    jobCounts[job.postalCode] = jobCounts[job.postalCode].filter(
      (timestamp) => now - new Date(timestamp) < 6 * 60 * 60 * 1000
    );

    if (jobCounts[job.postalCode].length >= 5) {
      console.log(jobCounts[job.postalCode]);
      exceeded = true;
    } else {
      jobCounts[job.postalCode].push(now.toISOString());
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(jobCounts, null, 2));

  return exceeded;
};

// Main function to run periodically
const main = async () => {
  // Iterate over all guilds
  for (const [guildId, locations] of locationData) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.log(`Guild ${guildId} not found`);
      continue;
    }

    // Fetch job data for all locations concurrently
    const jobDataPromises = locations.map((location) =>
      fetchData(guildId, location.locationName).then((jobData) => ({
        location,
        jobData,
      }))
    );

    const results = await Promise.all(jobDataPromises);

    // Process results for each location
    for (const { location, jobData } of results) {
      if (jobData && jobData.jobDetails.length > 0) {
        if (!checkAndUpdateFile(jobData.jobDetails)) {
          // Find the appropriate channel
          const channel = guild.channels.cache.find(
            (ch) =>
              ch.name ===
              `jobs-${location.locationName.toLowerCase().replace(/\s+/g, "-")}`
          );
          if (channel) {
            await channel.send(jobData.message);
            console.log(`Sent job listings to ${channel.name}`);
          } else {
            console.log(`Channel not found for ${location.locationName}`);
          }
        } else {
          console.log(`Message limit exceeded for ${location.locationName}`);
        }
      } else {
        console.log(`No job listings for ${location.locationName}`);
      }
    }
  }
  setTimeout(main, 60000);
};

// Start the bot and main loop
client.login(process.env.DISCORD_TOKEN).then(() => {
  setTimeout(main, 60000);
});
