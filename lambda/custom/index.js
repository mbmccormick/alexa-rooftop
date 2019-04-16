const alexa = require("ask-sdk-core");
const request = require("request");
const cheerio = require("cheerio");
const moment = require("moment-timezone");

moment.tz.setDefault("America/Los_Angeles");

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    },
    async handle(handlerInput) {
        console.log("INFO: Handling LaunchRequest");

        var message = "";
        
        var schedule = await getRooftopHours();
        message += "Rooftop is open today from " + moment(schedule.open).format("h:mm A") + " to " + moment(schedule.close).format("h:mm A") + ". ";

        var beers = await getRooftopTapList();
        message += "Here's what's on tap: " + implode(beers) + ". ";

        var foodTrucks = await getRooftopFoodTrucks();
        if (foodTrucks.length == 0) {
            message += "There is no food truck booked for today.";
        } 
        else {
            for (var i = 0; i < foodTrucks.length; i++) {
                if (i == foodTrucks.length - 1 &&
                    foodTrucks.length > 1) {
                    message += "And ";
                }
                message += foodTrucks[i].name + " will be serving " + implode(foodTrucks[i].cuisine) + " food from " + moment(foodTrucks[i].startTime).format("h:mm A") + " to " + moment(foodTrucks[i].endTime).format("h:mm A") + ".";
            }
        }

        message = alexa.escapeXmlCharacters(message);

        return handlerInput.responseBuilder
            .speak(message)
            .getResponse();
    }
};

const TapListRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "TAPLIST";
    },
    async handle(handlerInput) {
        console.log("INFO: Handling " + handlerInput.requestEnvelope.request.intent.name);

        var message = "";
        
        var beers = await getRooftopTapList();
        message += "Here's what's on tap today: " + implode(beers) + ". ";

        message = alexa.escapeXmlCharacters(message);
        
        return handlerInput.responseBuilder
            .speak(message)
            .getResponse();
    }
};

const FoodTruckRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "FOODTRUCK";
    },
    async handle(handlerInput) {
        console.log("INFO: Handling " + handlerInput.requestEnvelope.request.intent.name);

        var message = "";
        
        var foodTrucks = await getRooftopFoodTrucks();
        if (foodTrucks.length == 0) {
            message += "There is no food truck booked for today.";
        } 
        else {
            for (var i = 0; i < foodTrucks.length; i++) {
                if (i == foodTrucks.length - 1 &&
                    foodTrucks.length > 1) {
                    message += "And ";
                }
                message += foodTrucks[i].name + " will be serving " + implode(foodTrucks[i].cuisine) + " food from " + moment(foodTrucks[i].startTime).format("h:mm A") + " to " + moment(foodTrucks[i].endTime).format("h:mm A") + ".";
            }
        }

        message = alexa.escapeXmlCharacters(message);
        
        return handlerInput.responseBuilder
            .speak(message)
            .getResponse();
    }
};

const HoursRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "HOURS";
    },
    async handle(handlerInput) {
        console.log("INFO: Handling " + handlerInput.requestEnvelope.request.intent.name);

        var message = "";
        
        var schedule = await getRooftopHours();
        message += "Rooftop is open today from " + moment(schedule.open).format("h:mm A") + " to " + moment(schedule.close).format("h:mm A") + ". ";

        message = alexa.escapeXmlCharacters(message);
        
        return handlerInput.responseBuilder
            .speak(message)
            .getResponse();
    }
};

const HelpRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent";
    },
    handle(handlerInput) {
        console.log("INFO: Handling " + handlerInput.requestEnvelope.request.intent.name);

        var message = "";
        message += "This skill can help you find the tap list, food truck, and tap room hours for Rooftop Brewing Company in Seattle. Which one would you like?";
        
        var prompt = "";
        prompt += "Please choose tap list, food truck schedule, or tap room hours.";

        message = alexa.escapeXmlCharacters(message);
        prompt = alexa.escapeXmlCharacters(prompt);
        
        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(prompt)
            .getResponse();
    }
};

const StopRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
            (handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent" ||
                handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent");
    },
    handle(handlerInput) {
        console.log("INFO: Handling " + handlerInput.requestEnvelope.request.intent.name);

        return handlerInput.responseBuilder
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log("ERROR: " + error.message);

        var message = "";
        message += "Sorry, an error occurred. If you need help, just ask for help.";

        message = alexa.escapeXmlCharacters(message);

        return handlerInput.responseBuilder
            .speak(message)
            .getResponse();
    }
};

function getRooftopTapList() {
    return new Promise(((resolve, reject) => {
        request.get("https://docs.google.com/spreadsheets/d/1UDZQ-tmvlgWh13rmS27Ek_y--qN5Z-AKvjmczICIdnQ/pubhtml?headers=false&amp;gid=933615958&amp;range=A1:D22", function (err, response, body) {
            if (err) {
                console.log("ERROR: " + err);

                reject(err);
            }
        
            var $ = cheerio.load(body);

            var beers = [];
            $("tr .s1:parent").each(function (i, v) {
                beers.push($(this)
                    .text()
                    .trim()
                    .replace("IPA", "I.P.A.")
                );
            });

            resolve(beers);
        });
    }));
}

function getRooftopFoodTrucks() {
    return new Promise(((resolve, reject) => {
        request.get("https://www.seattlefoodtruck.com/api/events?page=1&for_locations=414&with_active_trucks=true&include_bookings=true&with_booking_status=approved", function (err, response, body) {
            if (err) {
                console.log("ERROR: " + err);
                
                reject(err);
            }
        
            var data = JSON.parse(body);

            var foodTrucks = [];
            data.events.forEach(function (event) {
                if (event.bookings.length > 0) {
                    var foodTruck = {
                        name: event.bookings[0].truck.name,
                        cuisine: event.bookings[0].truck.food_categories,
                        startTime: moment(event.start_time).format(),
                        endTime: moment(event.end_time).format()
                    };

                    if (moment(foodTruck.startTime).dayOfYear() == moment().dayOfYear()) {
                        foodTrucks.push(foodTruck);
                    }
                }
            });

            resolve(foodTrucks);
        });
    }));
}

function getRooftopHours() {
    return new Promise(((resolve, reject) => {
        request.get("http://rooftopbrewco.com/contact", { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0" } }, function (err, response, body) {
            if (err) {
                console.log("ERROR: " + err);
                
                reject(err);
            }
        
            var $ = cheerio.load(body);

            var hours = [];
            $("ul li p").each(function (i, v) {
                var expression = /([A-z]*)s \/\/ ((?:[0-9]|1[0-9])(?:|:[0-5][0-9])(?:am|pm)) to ((?:[0-9]|1[0-9])(?:|:[0-5][0-9])(?:am|pm))/g;
                var match = expression.exec($(this).text());

                var schedule = {
                    date: moment(match[1], "dddd").format(),
                    open: moment(match[2], "h:mma").format(),
                    close: moment(match[3], "h:mma").format()
                };

                if (moment(schedule.date).isoWeekday() == moment().isoWeekday()) {
                    hours.push(schedule);
                }
            });

            resolve(hours[0]);
        });
    }));
}

function implode(list) {
    if (list.length == 0) {
        return;
    }
    else if (list.length == 1) {
        return list[0];
    }
    else if (list.length == 2) {
        return list[0] + " and " + list[1];
    }
    else {
        var lastItem = list.pop();
        return list.join(", ") + ", and " + lastItem;
    }
}

const skillBuilder = alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        TapListRequestHandler,
        FoodTruckRequestHandler,
        HoursRequestHandler,
        HelpRequestHandler,
        StopRequestHandler
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .lambda();
