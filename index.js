/*  Author: David Davidov
    Description: - This program asks a user for their city and returns back a 
                    page with the current weather, an icon of the weather and 
                    the top news from that day.
                 - The APIs used are OpenWeather's API and Google News,
                 - If the user enters an invalid city, the website will display an 
                    error msg prompting the user to input a valid city.
                 - The website searches for through the cache file based on the 
                    current inputted city and if they were inputted on the same day.
*/
const http = require('http');
const port = 3000;
const server = http.createServer();
const fs = require('fs');
const url = require('url');
const credentials = require('./auth/credentials.json');
const https = require('https');
const querystring = require('querystring');
const cachefile = 'cache/newscache.json';

let serve_webpage = function(output, res){
   let articles = "";
   for(let i = 0; i < output.articles.length; i++){
    articles += `
                    <h2>${output.articles[i].title}\n</h2>\n
                    <p>${output.articles[i].description}\n</p>\n
                    <div class="readmore">
                        <button onclick="window.location.href = '${output.articles[i].url}';">Read More</button>
                    </div>
                `;
   }
    let webpage = `
    <!DOCTYPE html>\n
    <head>
        <meta charset="UTF-8">
        <style>
            body, html {
                height: 100%;
                background-image: url("backgrounds/search.jpg");
                background-repeat: no-repeat;
                background-size: cover;
                background-position: center;
                background-attachment: fixed;
            } 
            .readmore {
                text-align: center;
            }
            button{
                width: 130px;
                padding: 9px 20px;
                margin-left: auto;
                margin-right: auto;
                border-radius: 10px;
                background-color: rgba(131, 131, 131, 0.164);
                border: 3px solid rgba(0, 0, 0, 0.164);
                box-sizing: border-box;
                box-shadow: 
                12px 12px 16px 0 rgba(0, 0, 0, 0.25),
                -8px -8px 12px 0 rgba(255, 255, 255, 0.3);
                transition: 0.3s;
            }
            button:hover{ 
                width: 130px;
                padding: 9px 20px;
                margin-left: auto;
                margin-right: auto;
                border-radius: 10px;
                background-color: rgba(0, 0, 0, 0.164);
                border: 3px solid rgba(0, 0, 0, 0.164);
                box-sizing: border-box;
                box-shadow: 
                12px 12px 16px 0 rgba(255, 255, 255, 0.3),
                -8px -8px 12px 0  rgba(0, 0, 0, 0.25);
            }
            h2 {
                font-family: "Arial Black", Gadget, sans-serif;
                text-align: center;
                font-size: 15px;
                padding: 0px 0px;
            }
            p {
                font-family: "Arial", Gadget, sans-serif;
                text-align: center;
                font-size: 15px;
                
            }
            .heading{
                padding-top: 40px;
                font-family: "Arial Black", Gadget, sans-serif;
                text-align: center;
                font-size: 20px;
                opacity: 100%;
            }
            .articles{
                margin-left: 100px;
                margin-right: 100px;
                margin-bottom: 100px;
                border-radius: 10px;
                background-color: rgba(0, 0, 0, 0.164);
                border: 3px solid rgba(0, 0, 0, 0.164);
                box-sizing: border-box;
                box-shadow: 
                12px 12px 16px 0 rgba(255, 255, 255, 0.3),
                -8px -8px 12px 0  rgba(0, 0, 0, 0.25);
            }
        </style>
    </head>
            <html>\n
	            <body>
                <div class="heading">   
                    <h1>${output.city}, Currently: ${output.temp} &#8457; ${output.description}</h1>
                    <img src=${output.icon}">
                </div>
                <div class="articles">
                    ${articles}
                </div>
                </body>
	\n</html>`;
	res.end(webpage);
};

let search_news = function(output, res){
    let params = {
		q: output.city,
        token: credentials.google_news_key,
        max: 10
	}
	params = querystring.stringify(params)
	const searchOptions = 'https://gnews.io/api/v3/search?' + params;
    const search_req = https.request(searchOptions, function(search_res){
		let body = "";
		search_res.on('data', function(chunk){
			body += chunk;
		});
		search_res.on('end', function(){
			let response = JSON.parse(body);
            output.articles = response.articles;
            // overwrite cachefile once output structure is ready
            fs.writeFile('cache/newscache.json', JSON.stringify(output), (err) =>{
                if(err) throw err;
                else{
                    console.log('Cache Updated!');
                    serve_webpage(output, res);
                }
            });
		});
	});
	search_req.on('error', function(err){
		console.error(err);
	});
	search_req.end();
}
const checkCache = function(output, res){
    fs.readFile(`./${cachefile}`, 'utf8', (err, cacheString) =>{
        if(err){
            console.log(err);
            return;
        }
        let cacheData = JSON.parse(cacheString);
        if((output.city === cacheData.city) && 
        (output.date.getFullYear() === new Date(cacheData.date).getFullYear()) &&
        (output.date.getMonth() === new Date(cacheData.date).getMonth()) &&
        (output.date.getDate() === new Date(cacheData.date).getDate())){
            fs.readFile(`./${cachefile}`, 'utf8', (err, newCache)=>{
                if(err){
                    console.log(err);
                    return;
                }
                let newCacheData = JSON.parse(newCache);
                output.articles = newCacheData.articles;
                console.log('News loaded from cache.');
                serve_webpage(output, res);
            });
        } else {
            console.log('Cache doesnt match with current search');
            search_news(output, res);      
        } 
    });
}
let pick_weather_image = function(output, response, city, res){
    output.description = response.weather[0].description;
    output.date = new Date();
    // Going through the possible cases of weathers to choose our weather icon
    if(response.weather[0].id === 800){
        output.icon = "weatherIcons/sunny.png";
    }else if (response.weather[0].id >= 801 && response.weather[0].id <= 802){
        output.icon = "weatherIcons/cloudy2.png";
    }else if (response.weather[0].id >= 803 && response.weather[0].id <= 804){
        output.icon = "weatherIcons/overcast.png"
    }else if (response.weather[0].id >= 701 && response.weather[0].id <= 721 || response.weather[0].id >= 300 && response.weather[0].id <= 321){
        output.icon = "weatherIcons/light_rain.png"
    }else if (response.weather[0].id >= 741 && response.weather[0].id <= 781){
        output.icon = "weatherIcons/fog.png"
    }else if (response.weather[0].id >= 500 && response.weather[0].id <= 531){
        if(response.weather[0].id === 500){
            output.icon = "weatherIcons/light_rain.png";
        }else{
            output.icon = "weatherIcons/shower.png";
        }
    }else if(response.weather[0].id >= 600 && response.weather[0].id <= 622){
        output.icon = "weatherIcons/snow.png";
    }else if(response.weather[0].id >= 200 && response.weather[0].id <= 232){
        output.icon = "weatherIcons/tstorm.png";
    }

    // CHECK CACHE FIRST
    fs.access(cachefile, fs.F_OK, (err) => {
        if (err) {
            search_news(output, res);
            return;
        }
        //file exists
        checkCache(output, res);
      })
};
let convert_to_fahrenheight = function(response, city, res){
    //Converts the API default temp (Kelivin) -> fahrenheight 
    let output = {}; // Output is our JSON object that we will use to render the final html page
    output.city = city;
    output.temp = Math.round((1.8*(response.main.temp - 273))+32);
    pick_weather_image(output, response, city, res);
};
let searchWeather = function(city, res){
    let params = {
		q: city,
		appid: credentials.open_weather_key
	}
	params = querystring.stringify(params)
	const searchOptions = 'https://api.openweathermap.org/data/2.5/weather?' + params;
    const search_req = https.request(searchOptions, function(search_res){
		let body = "";
		search_res.on('data', function(chunk){
			body += chunk;
		});
		search_res.on('end', function(){
			let response = JSON.parse(body);     
            //Determines if our first API has a proper location inputed
            if(response.cod === 200){
                convert_to_fahrenheight(response ,city, res);
            }else {
                console.log(response.cod);
                //APIs telling us City is not found
                //present a modified version of index page
                const main = fs.createReadStream('html/re_enter.html');
                res.writeHead(200, {'Content-Type':'text/html'});
                main.pipe(res);
            }
		});
	});
	search_req.on('error', function(err){
		console.error(err);
	});
	search_req.end();
};

server.on("request", connection_handler);
function connection_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
    // HOMEPAGE
	if (req.url === '/' || req.url === '/main.html?'){
		const main = fs.createReadStream('html/main.html');
		res.writeHead(200, {'Content-Type':'text/html'});
		main.pipe(res);
    }
    // FAV ICON
	else if (req.url === '/favicon.ico'){
		const main = fs.createReadStream('weatherIcons/sunny.png');
		res.writeHead(200, {'Content-Type':'image/png'});
		main.pipe(res);
	}
    // SEARCH
    else if (req.url.startsWith('/search')){
        const user_input = url.parse(req.url, true).query;
        //TODO: CHECK & CREATE CACHE!
        searchWeather(user_input.city, res);
    }
    // BACKGROUNDS
    else if (req.url.startsWith('/backgrounds/')){
		const main = fs.createReadStream(req.url.substring(1));
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		main.pipe(res);
    }
    else if (req.url.startsWith('/weatherIcons/')){
		const main = fs.createReadStream(req.url.substring(1, req.url.length-3));
		res.writeHead(200, {'Content-Type':'image/jpeg'});
		main.pipe(res);
    }
    // 404 NOT FOUND
	else {
        const main = fs.createReadStream('html/404.html');
		res.writeHead(404, {'Content-Type':'text/html'});
		main.pipe(res);
	}
}

server.on("listening", listening_handler);
server.listen(port);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}