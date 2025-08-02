# housekeeper-bee-mcp-server
Housekeeper Bee MCP Server (STDIO)

# Introduction   
           
The MCP Server extends the functionality of the web-based Housekeeper Bee Application, which is designed for structural and fixed information flows. Using LLM, users are allowed to manage their storage box records in a dynamic and unstructured manner. The LLM client enhanced the UI/UX and user satisfaction. In the "Demonstration Clips" section, we show you how to use different languages and simple syntax to manage the storage asset records.

<br>

# Requirement

- NodeJS v22 
- Claude Desktop
- [Housekeeper Bee Server](https://github.com/Thomas-Leung-852/HousekeeperBeeWebApp) version 1.1.0 or above     
      
<br>      

# System Architecture 

![](https://hackteam.io/images/build-your-first-mcp-server-with-typescript-in-under-10-minutes-diagram.png)

[1] *"Local Remote" - Housekeeper Bee server app and admin server*    
[2] *Image Source - https://hackteam.io*     
[3] *All system components are in the same Wi-Fi network*

<br>    

# Installation 

 - Clone the files from GitHub ( [https://github.com/Thomas-Leung-852/housekeeper-bee-mcp-server.git](https://github.com/Thomas-Leung-852/housekeeper-bee-mcp-server.git) )    

 - Install node js dependances

```
npm install -y
```

<br>

# Configuration 

Open Claude Desktop confirguration file (claude_desktop_config.json) and add the following lines to the mcpServers section

The claude_desktop_config.json file for Claude Desktop is located in different paths depending on your operating system. For Windows, it's found in `%APPDATA%\Claude\claude_desktop_config.json`, and for macOS, it's in `~/Library/Application Support/Claude/claude_desktop_config.json`. 

**To find the file:**  

1. Windows:
Open File Explorer and paste `%APPDATA%\Claude\` into the address bar. You will find the claude_desktop_config.json file there. 
2. The file is automatically created when you click "Edit Config" in the Claude Desktop settings, under the "Developer" section. or you can create it manully.

<pre><code>
{
	"mcpServers": {
		"housekeeper bee mcp server": {
			"type": "stdio",
			"command": "%ProgramFiles%\\nodejs\\node.exe",
			"args": [
				" {YOUR\\PATH}\\housekeeperbee-mcp-server\\src\\index.js"
			],
			"env" :{
				"HOUSEKEEPER_BEE_USER_API_KEY":"<b><i><font color="#F00">{YOUR HOUSEKEEPER BEE API KEY}</font></i></b>",				
        	    "HOUSEKEEPER_BEE_URL":"<b><i><font color="#F00">{HOUSEKEEPER BEE APP SERVER IP}</font></i></b>",
        		"HOUSEKEEPER_BEE_PORT":"<b><i><font color="#F00">{HOUSEKEEPER BEE APP SERVER PORT default 8080}</font></i></b>",
				"HOUSEKEEPER_BEE_OUTPUT_FILE_PATH": "<b><i><font color="#F00">{local file folder - e.g. c:\\tmp\\ }</font></i></b>",
				"HOUSEKEEPER_BEE_ADMIN_URL": "<b><i><font color="#F00">{HOUSEKEEPER BEE ADMIN SERVER IP default same as server ip}</font></i></b>",
				"HOUSEKEEPER_BEE_ADMIN_PORT": "<b><i><font color="#F00">{HOUSEKEEPER BEE ADMIN SERVER PORT default 8088}</font></i></b>",
			}
		}
	}
}
</code></pre>

### Sample
![](https://static.wixstatic.com/media/0d7edc_8da9e88359c745c2ad067d98f5f9b9db~mv2.png)
    
<br>

3. Restart the Claude Desktop

<br>

# Demonstation Clips

YouTube

* [How to obtain the Housekeeper Bee API key](https://youtu.be/x7zshcqJTlY?si=3mgp6eS1h3IDHNOh)  <img style="width:10px;" valign="middle" src="https://icons.iconarchive.com/icons/paomedia/small-n-flat/48/star-icon.png" ><img style="width:10px;" valign="middle" src="https://icons.iconarchive.com/icons/paomedia/small-n-flat/48/star-icon.png" >      
* [Set Housekeeper Bee app server sleep schedule](https://youtu.be/mp-i6p8VztY?si=cXiPKha7JMGL2XKF)    
* [Retrieve Housekeeper Bee app server health status](https://youtu.be/gw5v88TVHnk?si=l6e4trW2sS8livto)        
* [Use AI object recognition to update the stored items](https://youtu.be/bToddC73sfo?si=aQu52ObRZtSdGfVN)<img style="width:10px;" valign="middle" src="https://icons.iconarchive.com/icons/paomedia/small-n-flat/48/star-icon.png" ><img style="width:10px;" valign="middle" src="https://icons.iconarchive.com/icons/paomedia/small-n-flat/48/star-icon.png" >                    
* [Batch rename storage boxes and change location](https://youtu.be/cd9snhRSTf8?si=f6VPrmQUWV-NjR2I)      
* [Relocate the storage boxes](https://youtu.be/ae4Awb_Q4gk?si=AlwkhX_sWMBxsrct)      
* [Add items to storage box description](https://youtu.be/7rqJVQMm_D0?si=356MRrNSL0tV7Wkl)      
* [Rename multiple storage locations](https://youtu.be/HDY6c1wTevo?si=8WathM6DpxpuV8UG)      
* [Verify and Renew the Session Token](https://youtu.be/Tt-v82Cc2hQ?si=csRWxtuDni-CWNLY)        
* [Voice input and translate to different languages to look up storage boxes.](https://youtu.be/y77HvV44JtE?si=sNPlSAOAilGdjC8l) <img style="width:10px;" valign="middle" src="https://icons.iconarchive.com/icons/paomedia/small-n-flat/48/star-icon.png" >     
* [Translation](https://youtu.be/Z4LLwdZtkb0?si=wTnGxkmHpmy5IqNo)    
* [Export storage boxes and locations raw data](https://youtu.be/0RxOJnAOrjQ?si=oJu-XQnxUxn9cMWH)       
* [Create Executive Summary & Infographic](https://youtu.be/LI0eJYVxSjs?si=XSVWChnA25IJt_iG)<img style="width:10px;" valign="middle" src="https://icons.iconarchive.com/icons/paomedia/small-n-flat/48/star-icon.png" >    



<br><br>
---
*vNetic workshop - 2025*   
*Last Update: 2025/08/02 by Thomas Leung*



