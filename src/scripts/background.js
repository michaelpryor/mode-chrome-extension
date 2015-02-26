// Create storage objects
createCredentials();
createStorageObject("schedules")
createStorageObject("history")

dowMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
}

// Function to create object in local storage
function createStorageObject(key) {
  chrome.storage.local.get(key,function(data) {
    if (jQuery.isEmptyObject(data) == true) {
      
      var obj = {};
      obj[key] = [];
      
      chrome.storage.local.set(obj, function() {});
    }
  })
}

// Function to credentials object
function createCredentials() {
  chrome.storage.local.get("credentials",function(data) {
    if (jQuery.isEmptyObject(data) == true) {
            
      cred = {
        "mode": { 
          "username":"",
          "password":""
        },
        "slack": {
          "username": "",
          "token":""
        },
        "mandrill": {
          "key": "",
          "name": "",
          "email": ""
        },
        "hipchat": {
          "token": ""
        }
      }
      
      chrome.storage.local.set({"credentials": cred}, function() {});
    }
  })
}

// Function to credentials object
function checkToSend(s) {
  var interval = s.cron.interval;
  
  if (interval == "interval-hourly") {
    return checkHourly(s);
  } else if (interval == "interval-daily") {
    return checkDaily(s);
  } else if (interval == "interval-weekly") {
    return checkWeekly(s);
  } else {
    return false;
  }
}

// Checks for hourly interval
function checkHourly(s) {
  
  // Get current timestamp
  var scheduledMinute = s.cron.minute,
      now = Date.now(),
      min = new Date(now).getMinutes();
        
  // If minutes match, send the notification
  if (scheduledMinute == min) {
    return true;
  
  // If schedule isn't new and catchup is set to true, check if a send has been missed
  } else if (s.cron.catchup == true) {
    
    // Get details on last send
    var lastSent = s.last_sent,
        lastSentMinute = new Date(lastSent).getMinutes();
    
    // Figure out how many minutes until the next send
    if (scheduledMinute > lastSentMinute) {
      minutesToNext = scheduledMinute - lastSentMinute;
    } else {
      minutesToNext = scheduledMinute - lastSentMinute + 60;
    }
    
    // Calculate time to the next send
    return hasNextPassed(lastSent,minutesToNext,0,0,now);
    
  } else {
    return false;
  }
}

// Checks for daily interval
function checkDaily(s) {

    // Get current timestamp
    var scheduledHour = s.cron.hour,
        scheduledMinute = s.cron.minute,
        now = Date.now(),
        hour = new Date(now).getHours(),
        min = new Date(now).getMinutes();
  
    // If minutes match, send the notification
    if (scheduledMinute == min && scheduledHour == hour) {
      return true;
  
    // If schedule isn't new and catchup is set to true, check if a send has been missed
    } else if (s.last_sent != 0 && s.cron.catchup == true) {
    
      // Get details on last send
      var lastSent = s.last_sent,
          lastSentHour = new Date(lastSent).getHours(),
          lastSentMinute = new Date(lastSent).getMinutes();
    
      // Figure out how many minutes until the next send
      minutesToNext = scheduledMinute - lastSentMinute;
      
      // Figure out how many hours until the next send
      if ( scheduledHour > lastSentHour || (scheduledHour == lastSentHour && scheduledMinute > lastSentMinute) ) {
        hoursToNext = scheduledHour - lastSentHour;
      } else {
        hoursToNext = scheduledHour - lastSentHour + 24;
      }
      
      return hasNextPassed(lastSent,minutesToNext,hoursToNext,0,now);
    
  } else {
    return false;
  }
}

// Checks for weekly interval
function checkWeekly(s) {
  
    // Get current timestamp
    var scheduledDay = dowMap[s.cron.day],
        scheduledHour = s.cron.hour,
        scheduledMinute = s.cron.minute,
        now = Date.now(),
        day = new Date(now).getDay(),
        hour = new Date(now).getHours(),
        min = new Date(now).getMinutes();
  
    // If minutes match, send the notification
    if (scheduledMinute == min && scheduledHour == hour && scheduledDay == day) {
      return true;
  
    // If schedule isn't new and catchup is set to true, check if a send has been missed
    } else if (s.last_sent != 0 && s.cron.catchup == true) {
    
      // Get details on last send
      var lastSent = s.last_sent,
          lastSentDay = new Date(lastSent).getDay(),
          lastSentHour = new Date(lastSent).getHours(),
          lastSentMinute = new Date(lastSent).getMinutes();
    
      // Figure out how many minutes until the next send
      minutesToNext = scheduledMinute - lastSentMinute;
      hoursToNext = scheduledHour - lastSentHour;
      
      // Figure out how many hours until the next send
      if (scheduledDay > lastSentDay || 
          (scheduledDay == lastSentDay && 
           (scheduledHour > lastSentHour || 
            (scheduledHour == lastSentHour && scheduledMinute > lastSentMinute
      )))) {
        daysToNext = scheduledDay - lastSentDay;
      } else {
        daysToNext = scheduledDay - lastSentDay + 7;
      }
      
      return hasNextPassed(lastSent,minutesToNext,hoursToNext,daysToNext,now);
    
  } else {
    return false;
  }
}

// Given time to next, checks if notification should be sent
function hasNextPassed(lastSent,minutesToNext,hoursToNext,daysToNext,now) {
  // Calculate time to the next send
  var timeToNext = (minutesToNext * 60000) + (hoursToNext * 60000 * 60) + (daysToNext * 60000 * 60 * 24),
      nextSendTS = lastSent + timeToNext,
      roundedTS = Math.floor(nextSendTS/(60000))*60000;
  
  // Check if next send has passed
  if (now > roundedTS) {
    return true;
  } else {
    return false;
  }
}

// Loop for schedule
setInterval(function(){ 
  // Read schedules from chrome storage
  chrome.storage.local.get("schedules", function(data) {
    
    schedules = data.schedules;
    
    schedules.forEach(function(s,i) {
      
      // Check if it's time to send it again
      var sendNow = checkToSend(s);
      
      if (sendNow == true) {
        // If true, set last send date and send
        var now = Date.now();
        schedules[i].last_sent = now;
        schedules[i].new = false;
      
        getReportDetailsAndPost(s.report, s.input, "schedule")
      } 
      
    })
    
    // Set schedule object
    chrome.storage.local.set({"schedules": schedules}, function() {});
    
  })
  
  
}, 60000);