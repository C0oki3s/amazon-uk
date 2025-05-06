const axios = require("axios");
const fs = require("fs");
const path = require("path");
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
    locale: "en-GB",
    country: "United Kingdom",
    keyWords: "",
    geoQueryClause: {
      lat: 51.924491609412,
      lng: -0.487100640539,
      unit: "mi",
      distance: 250,
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

const fetchData = async () => {
  try {
    const response = await axios.post(
      "https://qy64m4juabaffl7tjakii4gdoa.appsync-api.eu-west-1.amazonaws.com/graphql",
      {
        query,
        variables,
      },
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          Authorization:
            "Bearer Status|unauthenticated|Session|eyJhbGciOiJLTVMiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE3NDYwMjg3ODIsImV4cCI6MTc0NjAzMjM4Mn0.AQICAHh9Y3eh+eSawH7KZrCzIFETq1dycngugjOljT8N4eCxVgEP5iS/k7DF9QqH0sSmAd21AAAAtDCBsQYJKoZIhvcNAQcGoIGjMIGgAgEAMIGaBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDDJyCCz3/B/6xeZVUgIBEIBt80xrTJYoQFA/JjHFM1CsM49D8we2NpTemkk+Spu1Y1qCHKNEByJRclNfPkVY7dLEwxS4OFcQDDqmvres7NAtZGngGE+FMgrgthYkCGcuXs/cOgb+9swbHoLfJLDXAq2C1o4vqMw0TPErdJo2Aw==",
          "Content-Type": "application/json",
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
    const jobDetails = data?.data?.searchJobCardsByLocation?.jobCards.map(
      (job) => ({
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
      })
    );

    let message = `**New Job Listings in your specified location**\n\n`;
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
    console.error("Error:", error);
    return null;
  }
};

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

const sendMessage = async (message) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  try {
    const response = await axios.post(
      webhookUrl,
      {
        content: message,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(JSON.stringify(response.data));
  } catch (error) {
    console.error("Error:", error);
  }
};

const main = async () => {
  const { message, jobDetails } = await fetchData();
  if (jobDetails && jobDetails.length > 0) {
    if (!checkAndUpdateFile(jobDetails)) {
      await sendMessage(message);
    } else {
      console.log("Exceed Message count in 6 hours");
    }
  } else {
    console.log("No data");
  }
  setTimeout(main, 60000);
};

main();
