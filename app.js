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
      distance: 60,
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
            "Status|unauthenticated|Session|eyJhbGciOiJLTVMiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE3MTY1ODIyOTUsImV4cCI6MTcxNjU4NTg5NX0.AQICAHj70Se3MiDcPzFAaBWEUnkjrGmzv9g3W3mMwfMWM31A0QF4t9bpC4haT1wU7TGAPhXsAAAAtDCBsQYJKoZIhvcNAQcGoIGjMIGgAgEAMIGaBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDIZ0EcLVvQgBNFdG8gIBEIBtKi8Jghj3/n5iOm52n7CJo8VlW1L7I4Td/u5xIZQFnJXnnlCk8jIQ5jc9sH6gclsFign0U9Upc56kyiaOAXOzWdoK0BqNKe02ngCucNafG/DXVubiA62K5ixppaGf29DJnzU1eEpON/i9VPjm7w==",
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
    const jobDetails = data?.data?.searchJobCardsByLocation?.jobCards.map(
      (job) => ({
        locationName: job.locationName,
        jobType: job.jobType,
        postalCode: job.postalCode,
      })
    );
    let message = "\n--- New Job Listings ---\n";
    jobDetails.forEach((detail, index) => {
      message += `${index + 1}) Location: ${detail.locationName},\nJobType: ${
        detail.jobType
      },\nPostCode: ${detail.postalCode} \n\n`;
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
  var qs = require("qs");
  var data = qs.stringify({
    token: process.env.TOKEN,
    to: process.env.TO,
    body: message,
    priority: 10,
    referenceId: "",
    msgId: "",
    mentions: "",
  });

  var config = {
    method: "post",
    url: "https://api.ultramsg.com/instance86688/messages/chat",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
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
