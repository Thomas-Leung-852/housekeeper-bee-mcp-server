import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { promises as fs } from "fs"
import ExcelJS from 'exceljs'
import axios, { HttpStatusCode } from 'axios'
import open from 'open';
import { readFile, writeFile } from "fs/promises"
import jwt from 'jsonwebtoken'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';   //allow use sign-signed cert

const apiKey = process.env.HOUSEKEEPER_BEE_USER_API_KEY
const serverUrl = process.env.HOUSEKEEPER_BEE_SERVER_URL
const adminUrl = process.env.HOUSEKEEPER_BEE_ADMIN_URL
const exportFilePath = process.env.HOUSEKEEPER_BEE_OUTPUT_FILE_PATH

//=========================================================================================================================================================================
// FUNCTIONS
//=========================================================================================================================================================================

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: Check environment variables defined
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const isEnvVariablesOkay = () => {
  if (!apiKey) { throw new Error("\"HOUSEKEEPER_BEE_USER_API_KEY\" is not defined in environment variables.") }
  if (!serverUrl) { throw new Error("Housekeeper Bee App \"HOUSEKEEPER_BEE_SERVER_URL\" is not defined in environment variables.") }
  if (!adminUrl) { throw new Error("Housekeeper Bee App \"HOUSEKEEPER_BEE_ADMIN_URL\" is not defined in environment variables.") }
  if (!exportFilePath) { throw new Error("Housekeeper Bee App \"HOUSEKEEPER_BEE_OUTPUT_FILE_PATH\" is not defined in environment variables.") }
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: Format date in ddMMyyHHmmss
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const formatDateTimeWithRandomNumber = () => {
  // Get the current date and time
  const now = new Date();

  // Extract day, month, year, hours, minutes, and seconds
  const day = String(now.getDate()).padStart(2, '0'); // Ensure two digits
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0'); // Ensure two digits
  const minutes = String(now.getMinutes()).padStart(2, '0'); // Ensure two digits
  const seconds = String(now.getSeconds()).padStart(2, '0'); // Ensure two digits

  // Format date and time to ddMMyyyyHHmmss
  const dateTimeString = `${day}${month}${year}${hours}${minutes}${seconds}`;

  // Generate a random number between 0 and 9
  const randomNumber = Math.floor(Math.random() * 10);

  // Combine the date-time string and the random number
  return `${dateTimeString}${randomNumber}`;
};

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: Get a new file name
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const getNewFileName = (prefix, extension) => {
  return `${prefix}${formatDateTimeWithRandomNumber()}.${extension}`
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: Export Json to excel
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const exportJsonToExcel = async (jsonData) => {
  //* Create a new workbook and a worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  worksheet.addRow(Object.keys(jsonData[0]))

  //* Add rows from JSON data
  jsonData.forEach(item => {
    worksheet.addRow(Object.values(item));
  });

  //* Write to an Excel file
  const fileName = getNewFileName('out', 'xlsx')
  const filePath = `${exportFilePath}${fileName}`

  try {
    await workbook.xlsx.writeFile(filePath);
  } catch (error) {
  }
};

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: Convert JSON string to HTML table
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const jsonToHtml = (jsonString) => {
  try {
    // Parse the JSON string
    const jsonArray = JSON.parse(jsonString);

    // Check if the array is not empty
    if (jsonArray.length === 0) return '<p>No data available.</p>';

    // Create an HTML table
    let html = '<table border="1"><thead><tr>';

    // Get dynamic headers from the keys of the first object
    const headers = Object.keys(jsonArray[0]);
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Iterate over each object in the array
    jsonArray.forEach(item => {
      html += '<tr>';
      headers.forEach(header => {
        html += `<td>${item[header]}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    // Return the generated HTML
    return html;
  } catch (error) {
    console.error('Invalid JSON string:', error.message);
    return '<p>Error parsing JSON data.</p>';
  }
};

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: write text to local file folder
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const writeToTextFile = async (text, filename) => {
  try {
    await writeFile(filename, text);
    return "saved";
  } catch (err) {
    return err.message;
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: read text file from local folder
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const readTextFromFile = async (filePath) => {
  var txt = ""

  try {
    txt = await readFile(filePath, 'utf-8'); // Specify encoding to get a string
  } catch (err) {
    txt = err.message
  }

  return txt
};

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: Get Session token
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const getSessionTokenFromFile = async () => {

  const fn = "session_token.json"
  const path = exportFilePath
  const filePath = `${path}${fn}`

  var rst = '{"status":"error", "message":"getSessionTokenFromFile::unknown error"}'

  try {
    const sessionToken = await readTextFromFile(filePath)
    const token = JSON.parse(sessionToken).housekeeper_bee_jwt

    rst = '{"status":"success", "message":"' + token + '"}'
  } catch (err) {
    rst = `{"status":"error", "message":"session token got error"}`
  }

  return rst
}

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Func :: JWT verify function
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const decodeToken = (token) => {
  // Decode the token without verification
  const decoded = jwt.decode(token);

  // Check if decoding resulted in an error
  if (!decoded) {
    console.error('Failed to decode token: Token is invalid or malformed.');
    return null; // Return null for invalid tokens
  }

  return decoded; // Return decoded claims if valid
};

const isTokenExpired = (decoded) => {
  if (!decoded || !decoded.exp) {
    return true; // Token is either invalid or has no expiration
  }
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  return decoded.exp < currentTime; // Returns true if expired
};


//=========================================================================================================================================================================
// Main - Tools 
//=========================================================================================================================================================================
const server = new McpServer({
  name: "Houserkeeper Bee MCP Server",
  version: "1.1.0",
})

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: find box name, detail by keywords
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "findStorageBoxes",
  {
    title: "find storage boxes",
    description: `Find storage box details by using keywords, which are separated with a comma, or use * character to get all boxes without keyword. 
    If users do not mention 'match all', the default is false. `,
    inputSchema: { keywords: z.string(), matchAll: z.boolean().default(false) }
  },
  async ({ keywords, matchAll }) => {

    isEnvVariablesOkay()

    const response = await fetch(`${serverUrl}/api/housekeeping/storage/mcp/findStorageBox/${keywords}/${matchAll}`, {
      headers: {
        'x-api-key': `${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status} ${response.statusText}`)
    }

    const data = await response.text();

    return {
      content: [{ type: "text", text: data }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: find boxes by barcode
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "findStorageBoxesByBarcode",
  {
    title: "find storage boxes by barcode",
    description: "Find storage box details by using barcode, use * character to get all boxes has barcode.",
    inputSchema: { barcode: z.string() }
  },
  async ({ barcode }) => {

    isEnvVariablesOkay()

    const response = await fetch(`${serverUrl}/api/housekeeping/storage/mcp/findStorageBoxByBarcode/${barcode}`, {
      headers: {
        'x-api-key': `${apiKey}`, // Add the API key in the header
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status} ${response.statusText}`)
    }

    const data = await response.text();

    return {
      content: [{ type: "text", text: data }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: find location by name
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "findStorageLocationByName",
  {
    title: "find storage locations by name",
    description: `Find storage locations by name. Use * character to get all locations. The match all option default is true. 
    The resulting field names convert to human-readable.`,
    inputSchema: { locationName: z.string(), matchAll: z.boolean().default(true) }
  },
  async ({ locationName, matchAll }) => {

    isEnvVariablesOkay()

    const response = await fetch(`${serverUrl}/api/housekeeping/storage/mcp/findLocationByName/${locationName}/${matchAll}`, {
      headers: {
        'x-api-key': `${apiKey}`, // Add the API key in the header
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status} ${response.statusText}`)
    }

    const data = await response.text();

    return {
      content: [{ type: "text", text: data }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: delete boxes
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "delStorageBox",
  {
    title: "Delete Storage Box",
    description: `Call verifyLocSessionToken to verify the session token first. If the Session token is valid, pass it to the sessionToken parameter. 
    If a session token has an error, get a new session token before deleting boxes. Delete the storage box by using the storage box code. 
    Need user confirmation. Do NOT allow deleting more than 10 storage boxes. Wait for user confirmation.`,
    inputSchema: { storageCode: z.string(), sessionToken: z.string() }
  },
  async ({ storageCode, sessionToken }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('storage_box_code', storageCode);
      formData.append('session_token', sessionToken);

      const response = await axios.delete(`${serverUrl}/api/housekeeping/storage/mcp/delStorageBox`, {
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-api-key': `${apiKey}`,
        },
      });

      const data = await JSON.stringify(response.data);

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`Error: Fail to a delete storage box: ${error.message}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: edit boxes description
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "editStorageBoxDescription",
  {
    title: "Edit Storage Box decription",
    description: `Edit storage box description. If the prompt has images, classify at the highest level and count the total 
    and then summarize and shorten the recognition result to a comma text within 256 characters. Call verifyLocSessionToken to verify session token first. 
    If the Session token is valid, pass it to the sessionToken parameter. If a session token has an error, get a new session token before editing boxes. 
    Edit the storage box description by using storage box code. Default overwrite the description.`,
    inputSchema: { storageCode: z.string(), sessionToken: z.string(), newDescription: z.string(), overwrite: z.boolean().default(true) }
  },
  async ({ storageCode, sessionToken, newDescription, overwrite }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('session_token', sessionToken);
      formData.append('storage_box_code', storageCode);
      formData.append('storage_box_description', newDescription);
      formData.append('overwrite', overwrite);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}`
      };

      const response = await axios.put(`${serverUrl}/api/housekeeping/storage/mcp/editStorageBoxDescription`, formData, { headers });

      const data = await JSON.stringify(response.data);

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`Error: Fail to a edit storage box description: ${error.message}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: change storage box location
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "changeStorageBoxLocation",
  {
    title: "Change Storage Box Location",
    description: `Provide Storage Box Code and Location Code to move a storage box to a new location. Must provide both Storage Code and location code.`,
    inputSchema: { storageCode: z.string(), locationCode: z.string() }
  },
  async ({ storageCode, locationCode }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('storageCode', storageCode);
      formData.append('locationCode', locationCode);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}` // Example of a custom header
      };

      // Make a PUT request with headers
      const response = await axios.put(`${serverUrl}/api/housekeeping/storage/mcp/moveStorageBox/`, formData, { headers });

      const data = await response.data;

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`Error: Fail to move storage box to new location: ${error.message}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: rename storage box
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "renameStorageBox",
  {
    title: "rename Storage Box",
    description: `Call verifyLocSessionToken to verify the session token first. If the session token is valid, pass it to the sessionToken parameter.  
    If the session token has an error, get a new session token before processing. Must provide both Storage Code and new storage box name. 
    The new name must be mini 5 characters and max 48 characters. DO NOT support * characters for keyword search and should match all characters. 
    Only allow updating one storage box per request. MUST ask and wait for user confirmation before renaming the box.`,
    inputSchema: { storageCode: z.string(), newStorageBoxName: z.string(), sessionToken: z.string() }
  },
  async ({ storageCode, newStorageBoxName, sessionToken }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('storage_code', storageCode);
      formData.append('new_box_name', newStorageBoxName);
      formData.append('session_token', sessionToken);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}`
      };

      // Make a PUT request with headers
      const response = await axios.put(`${serverUrl}/api/housekeeping/storage/mcp/renameStorageBox/`, formData, { headers });

      const data = await JSON.stringify(response.data);

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`{"status":"error",  "msg":"Exception: rename storage to new name: ${error.message}"}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: rename storage Location name
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "renameStorageLocationName",
  {
    title: "rename Storage Location Name",
    description: `Call verifyLocSessionToken to verify session token first. If the Session token is valid, pass it to the sessionToken parameter. 
    If the session token has an error, get a new session token before processing. Must provide both a storage location code and a new storage location name. 
    The new name must be between 5 and 48 characters. Do not support * characters for keyword search and should match all characters. 
    Only allow updating one storage location per request. MUST ask for confirmation and wait for user confirmation.`,
    inputSchema: { LocationCode: z.string(), newLocationName: z.string(), sessionToken: z.string() }
  },
  async ({ LocationCode, newLocationName, sessionToken }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('location_code', LocationCode);
      formData.append('new_name', newLocationName);
      formData.append('token', sessionToken);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}`
      };

      // Make a PUT request with headers
      const response = await axios.put(`${serverUrl}/api/housekeeping/locations/mcp/renameLocation`, formData, { headers });

      //const data = await response.data;
      const data = await JSON.stringify(response.data);

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`"status":"error","msg":"Error: rename location to new name: ${error.message}"`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: Get Session Token
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "getHousekeeperBeeSessionToken",
  {
    title: "get housekeeper access token",
    description: `Getting an access session token to perform the update/ delete and rename request. 
    Users should send the login name to get a token.  Ask the user to provide a login name next time. 
    Forget the login name now! DO NOT KEEP the login name in your context !!!`,
    inputSchema: { username: z.string() }
  },
  async ({ username, pwd }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append("username", username);

      // Define custom headers
      // multipart/form-data
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': `${apiKey}` // Example of a custom header
      };

      // Make a PUT request with headers
      //      const response = await axios.post(`http://${url}:${appPort}/api/housekeeping/authenticate/mcp/getSessionToken`, formData, { headers });

      const response = await axios.post(`${serverUrl}/api/housekeeping/authenticate/mcp/getSessionToken`, formData, { headers, maxRedirects: 0 });

      const data = await response.data;

      const jsonString = JSON.stringify(data);

      const fileFullPath = `${exportFilePath}session_token.json`

      if (jsonString.indexOf('bee_jwt') > 0) {
        var rst = writeToTextFile(jsonString, fileFullPath)
      }

      return {
        content: [{ type: "text", text: jsonString }]
      };

    } catch (error) {
      var errMsg = error.message

      if (errMsg.indexOf("status code 302") > 0) {
        errMsg += ". The HTTP to HTTPS redirect is causing a Node.js error. Please update the URI to use HTTPS in the claude_desktop_config.json file.";
      }

      throw new Error(`Exception: ${errMsg}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: exportToJsonFile
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "exportToJsonFile",
  {
    title: "Save As Json text file",
    description: `write a Json String to a text file in ${exportFilePath} folder.`,
    inputSchema: { jsonStr: z.string(), filename: z.string().default('out') }
  },
  async ({ jsonStr, filename }) => {
    isEnvVariablesOkay()

    // Save the json string to a local text file
    const filePath = `${exportFilePath}${filename}.json`

    var result = "Done!"

    if (!writeToTextFile(jsonStr, filePath)) {
      result = 'fail to write text to file!';
    }

    return {
      content: [{ type: "text", text: 'Done!' }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: exportToExcelFile
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "exportToExcelFile",
  {
    title: "Save As Excel",
    description: `Convert a given Json String to a Excel file and save to the ${exportFilePath} folder.`,
    inputSchema: { jsonStr: z.string() }
  },
  async ({ jsonStr }) => {
    isEnvVariablesOkay()

    const jsonData = JSON.parse(jsonStr);

    exportJsonToExcel(jsonData)

    return {
      content: [{ type: "text", text: 'Done!' }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: exportToHtmlFile
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "exportToHtmlFile",
  {
    title: "Save As Html",
    description: `Convert the given Json String to a HTML file and save to the ${exportFilePath} folder.`,
    inputSchema: { jsonStr: z.string(), autoOpen: z.boolean().default(true) }
  },
  async ({ jsonStr, autoOpen }) => {
    isEnvVariablesOkay()

    const generatedHtml = jsonToHtml(jsonStr);

    // Save the HTML to a local file
    const fileName = getNewFileName('out', 'html')
    const filePath = `${exportFilePath}${fileName}`

    fs.writeFile(filePath, generatedHtml, (err) => {
    })

    if (autoOpen) {
      open(`${filePath}`)
    }

    return {
      content: [{ type: "text", text: 'Done!' }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: verifyLocSessionToken
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "verifyLocSessionToken",
  {
    title: "Verify Session Token",
    description: `Check the local stored session token file, named "session_token.json", stored in the ${exportFilePath} folder. 
    This function opens it and verifies the JSON string. If the file is missing or the token has expired. 
    It returns an error. The calling function should call the getHousekeeperBeeSessionToken tool to get a new session token. 
    Save the new session token to the ${exportFilePath} for future use.`,
    inputSchema: {}
  },
  async ({ }) => {
    isEnvVariablesOkay()

    var chkResult = "session token is valid"
    var jwtToken = ""
    const sessionToken = await getSessionTokenFromFile()

    if (JSON.parse(sessionToken).status != 'success') {
      chkResult = "Session Token ERROR: session_token.json file not exist or invalid format."
    } else {
      jwtToken = JSON.parse(sessionToken).message
      const decodedClaims = decodeToken(jwtToken);

      if (decodedClaims) {
        const expired = isTokenExpired(decodedClaims);

        if (expired) {
          chkResult = "Session Token ERROR: expired"
        } else {
          chkResult = "Session token is valid"
        }

      } else {
        chkResult = "Session Token ERROR: invalid format"
      }
    }

    return {
      content: [{ type: "text", text: chkResult }, { type: "text", text: `session token is ${jwtToken}` }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: Get Application Server status
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "getAppServerInfo",
  {
    title: "Get Application Server Information",
    description: `It gets the current status of the Housekeeper Bee server, which includes CPU temperature, IO Temperature and scheduled sleep details. 
    Converts field names to human-readable. `,
    inputSchema: {}
  },
  async ({ }) => {

    isEnvVariablesOkay()

    const thisUrl = `${adminUrl}/api/housekeeping/admin/system/mcp/getSysInfo`
    const response = await fetch(thisUrl, {
      headers: {
        'x-api-key': `${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`{"Error":"Error fetching data: ${response.status} ${response.statusText} "}`)
    }

    //const data = await JSON.stringify(response.data);
    const data = await response.text();

    return {
      content: [{ type: "text", text: data }]
    };
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: Set system sleep schedule
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "setSleepSchedule",
  {
    title: "Set sleep schedule",
    description: `Set Housekeeper Bee's sleep schedule. You MUST verify the session token for the very being. If you find an error, you should terminate the process. 
    You should provide 24-hour options in 24Hr clock format. Convert duration to minutes and must be within 10 hours. 
    Finally, calculate the wake-up time. Users can disable the schedule and there is no need to define when the system goes to sleep and wakes up.`,
    inputSchema: {
      sessionToken: z.string(), sleepHour: z.string().default("00"), sleepMinute: z.string().default("00"), duration: z.number().default(0),
      enableSchedule: z.boolean().default(true)
    }
  },
  async ({ sessionToken, sleepHour, sleepMinute, duration, enableSchedule }) => {

    isEnvVariablesOkay()

    const thisUrl = `${adminUrl}/api/housekeeping/admin/system/mcp/setSleepSchedule`

    const decodedUrl = new URL(`${serverUrl}`)

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append("server_url", serverUrl);
      formData.append("session_token", sessionToken);
      formData.append("hour", sleepHour);
      formData.append("minute", sleepMinute);
      formData.append("duration", duration);
      formData.append("enable_schedule", enableSchedule);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}`
      };

      const response = await axios.post(thisUrl, formData, { headers });
      const data = await response.data;
      const jsonString = JSON.stringify(data);

      return {
        content: [{ type: "text", text: jsonString }]
      };

    } catch (error) {
      throw new Error(`Exception: ${error.message}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: remove storage box tags
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "removeStorageBoxTags",
  {
    title: "remove Storage Box Tags",
    description: `This tool uses the storage box code to delete its tags. The tags are provided as a comma-separated text. To remove the tags, a valid session token is required. 
    You can obtain the storage box code using either the box name or the box barcode.`,
    inputSchema: { storageCode: z.string(), commaTags: z.string(), sessionToken: z.string() }
  },
  async ({ storageCode, commaTags, sessionToken }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('session_token', sessionToken);
      formData.append('tags', commaTags);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}`
      };

      // Make a PUT request with headers
      const response = await axios.patch(`${serverUrl}/api/housekeeping/storage/mcp/${storageCode}/tags/remove`, formData, { headers });

      const data = await JSON.stringify(response.data);

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`{"status":"error",  "msg":"Exception: remove storage tag: ${error.message}"}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: add storage box tags
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "addStorageBoxTags",
  {
    title: "add Storage Box Tags",
    description: `This tool uses the storage box code to add tags. The tags should be provided as a comma-separated list, with no spaces after the commas, and should be trimmed. 
To add tags, a valid session token is required. You can obtain the storage box code using either the box name or the box barcode.
IMPORTANT: Only letters and numbers are accepted! Special characters, such as single quotes and double quotes, are not supported. For example, 'man's' and "man"s" are invalid. 
If the request contains invalid input, you should not process it and must display an error message!`,
    inputSchema: { storageCode: z.string(), commaTags: z.string(), sessionToken: z.string() }
  },
  async ({ storageCode, commaTags, sessionToken }) => {
    isEnvVariablesOkay()

    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('session_token', sessionToken);
      formData.append('tags', commaTags);

      // Define custom headers
      const headers = {
        'Content-Type': 'multipart/form-data',
        'x-api-key': `${apiKey}`
      };

      // Make a PUT request with headers
      const response = await axios.patch(`${serverUrl}/api/housekeeping/storage/mcp/${storageCode}/tags/add`, formData, { headers });

      const data = await JSON.stringify(response.data);

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`{"status":"error",  "msg":"Exception: add storage tag: ${error.message}"}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ANCHOR - Tool :: find storage box by tag
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
server.registerTool(
  "findStorageBoxByTag",
  {
    title: "find the Storage Boxes by Tag",
    description: `It uses the provided tag to search for related storage boxes.`,
    inputSchema: { tag: z.string() }
  },
  async ({ tag }) => {
    isEnvVariablesOkay()

    try {
      const response = await fetch(`${serverUrl}/api/housekeeping/storage/mcp/search/tag/${tag}`, {
        headers: {
          'x-api-key': `${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.status} ${response.statusText}`)
      }

      const data = await response.text();

      return {
        content: [{ type: "text", text: data }]
      };

    } catch (error) {
      throw new Error(`{"status":"error",  "msg":"Exception: find box by tag: ${error.message}"}`)
    }
  }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Start server
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const transport = new StdioServerTransport()
await server.connect(transport)
