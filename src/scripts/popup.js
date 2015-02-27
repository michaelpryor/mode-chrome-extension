// Gets current account for share from editor
chrome.extension.onMessage.addListener(function(request, sender) {

  if (request.action == "getAccount") {
    source = request.source;
  }

  chrome.tabs.getSelected(null,function(tab) {
    chrome.tabs.captureVisibleTab(null, function(img) {

      console.log(img)

        var match = checkMatch(tab.url)

        $("#share-now").click(function() {
          shareNow(tab, img, match, source);
        })

        $("#create-schedule").click(function() {
          createSchedule(tab, img, match, source);
        })
    })
  })

});

// Allows for opening links
$(document).ready(function(){
   $('body').on('click', 'a', function(){
     chrome.tabs.create({url: $(this).attr('href')});
     return false;
   });
});

// Executes script to get account from HTML head
checkAccount()

highlightTab("share-tab");
showPage("share-page");
checkSharePage();

// Draw SVG for status indicator
drawStatusIndicator()

// Colors for success and failure status indicators
var successColor = "#00ADA9",
    failureColor = "#B80000";

// Show share history menu
$(".history-tab").click(function() {
  highlightTab("history-tab")
  showPage("history-page")
  showHistory()
})

// Show schedule list
$(".schedule-tab").click(function() {
  highlightTab("schedule-tab")
  showPage("schedule-page")
  showSchedules()
})

// Back button for main page
$(".share-tab").click(function() {
  highlightTab("share-tab")
  showPage("share-page")
  checkSharePage()
})

// Show settings tab
$(".settings-tab").click(function() {
  highlightTab("settings-tab")
  showPage("settings-page")
  fillSettings()
})

// Saves settings automatically
$(".cred-form").on("keyup", function() {
    saveSettings()
})

// Validate current crendentials
$("#validate-settings").click(function() {
  $("#slack-validation").text("Checking Slack...").css("color","#666");
  $("#email-validation").text("Checking Email...").css("color","#666");
  $("#hipchat-validation").text("Checking Hipchat...").css("color","#666");
  $("#mode-validation").text("Checking Mode...").css("color","#666");

  checkCredentials();
})

// Clears share history
$("#clear-history").click(function() {
  chrome.storage.local.set({"history": []}, function() {})
  showHistory()
})

// Shows schedules form
$("#share-schedule").click(function() {
  if(!$(".now-form").hasClass("hide")){ $(".now-form").addClass("hide");};
  $(".schedule-form").removeClass("hide");

  renderTimeSelectors()
})

// Changes schedule options based on chosen interval
$(".interval-button").click(function() {
  var id = $(this).attr("id")

  highlightInterval(id);
  renderTimeSelectors();

})

// Shows schedules form
$("#cancel-schedule-create").click(function() {
    if(!$(".schedule-form").hasClass("hide")){ $(".schedule-form").addClass("hide");};
    $(".now-form").removeClass("hide");
})

// Show schedule details
$(".schedule-list-items").on("click",".schedule-show-detail",function() {
  var id = $(this).attr("id");
  var n = +id.slice(7,100);

  showScheduleDetailById(n);
})

// Go back to schedule list from schedule detail page
$("#back-to-schedule-list").click(function() {
  highlightTab("schedule-tab")
  showPage("schedule-page")
  showSchedules()
})

// Delete schedule from list
$(".schedule-detail").on("click",".schedule-delete",function() {
  var id = $(this).attr("id");
  var n = +id.slice(3,100);

  deleteScheduleById(n);

})

// Checks for account in case it's missing from URL
function checkAccount() {
  chrome.tabs.executeScript(null, {
    file: "scripts/getPagesSource.js"
  }, function() {});
}

// Checks the url of the current page to see if share form should be shown
function checkSharePage() {

  // Shows share form if on Mode report
  chrome.tabs.getSelected(null,function(tab) {
    var match = checkMatch(tab.url);

    if (match == "report") {
      if($(".share-form").hasClass("hide")){ $(".share-form").removeClass("hide");}
      if(!$("#go-to-mode").hasClass("hide")){ $("#go-to-mode").addClass("hide");}

   } else {
      if(!$(".share-form").hasClass("hide")){ $(".share-form").addClass("hide");}
      if($("#go-to-mode").hasClass("hide")){ $("#go-to-mode").removeClass("hide");}
    }
  })
}

// Checks if you're on a sharable page
function checkMatch(url) {
  var domainLocation = url.indexOf("https://modeanalytics.com/"),
      reportLocation = url.indexOf("/reports/"),
      editorLocation = url.indexOf("/editor/");

  if (domainLocation == 0 && reportLocation > 0 && editorLocation == -1) {
    return "report";

  } else if (domainLocation == 0 && reportLocation > 0 && editorLocation > 0) {
    return "editor";

  } else {
    return "other";

  }


}

// Execute on clicking share now button
function shareNow(tab, img, match, source) {

  resetIndicators(); // Resets all step indicators
  $(".status").removeClass("hide");

  var reportTokens = getReportTokens(tab, match, source, img), // Get report token from active URL
      input = getFormInput();  // Get form input

  getReportDetailsAndPost(reportTokens,input,"instant");
}

// Create a scheule from the create schedule button
function createSchedule(tab, img, match, source) {

  resetIndicators(); // Resets all step indicators
  $(".status").removeClass("hide");

  var reportTokens = getReportTokens(tab, match, source, img), // Get report token from active URL
      input = getFormInput();  // Get form input

  createScheduleEntry(reportTokens,input);

}

// Get account from current tab
function getReportTokens(tab, match, source, img) {
  var url = tab.url;

  // Parse URL if it's a report
  if (match == "report") {
    reportLocation = url.indexOf("/reports/"),
    account = url.slice(26,reportLocation),
    token = url.slice(reportLocation + 9, reportLocation + 21)

  // Parse Source if it's the editor
  } else if (match == "editor") {
    reportLocation = source.indexOf("/reports/"),
    account = source.slice(5,reportLocation),
    token = source.slice(reportLocation + 9, reportLocation + 21)
  }

  // Response for report that's being shared
  stepState(1,true)

  return { "account": account, "token": token, "image":img };
}

// Gets form input, alerts if there is no sharing channel
function getFormInput() {
  // Form inputs
  var slackChannels = $("#slack-form").val(),
      hipchats = $("#hipchat-form").val(),
      emails = $("#email-form").val(),
      message = $("#message-form").val(),
      table = $("#include-table").prop("checked"),
      interval = $(".interval-button.active").attr("id"),
      day = $("#day-selector").val(),
      hour = $("#hour-selector").val(),
      minute = $("#minute-selector").val(),
      catchup = $("#catchup-box").prop("checked");

  // Alert if both are blank
  if (slackChannels == "" && emails == "" && hipchats == "") {

    stepState(2,false)
    addErrorMessage("You must pick somewhere to share this report!");

  } else {

    var inputs = { "slacks":slackChannels, "hipchats": hipchats, "emails":emails, "message": message, "table": table,
      "interval": interval, "day": day, "hour": hour, "minute": minute, "catchup": catchup };

    // Show inputs
    stepState(2,true)

    return inputs;
  }


}

// Function that posts message to Slack
function postToSlack(slackCreds, channel, pc) {

  // Creates JSON for a fancy post
  var postJSON = [
    {
      "fallback": pc.title + "\n" + pc.desc + "\n" + pc.link + "\n" + pc.last_run,
      "pretext": pc.message,
      "title": pc.title,
      "title_link": pc.link,
      "text": pc.desc + "\nRun on " + dateSringFormat(pc.last_run)
    }
  ];

  // Append table text if box is selected
  if (pc.table == true) {
    resultText = makeTableFromResult(pc.data,"url");
    messageEnd = "&text=```" + resultText + "```";
  } else {
    messageEnd = "";
  }

  // Gets compoents for post URL
  var postText = JSON.stringify(postJSON),
      username = slackCreds.username;

  var cleanChannel = replaceAll(" ","",replaceAll("#","%23",replaceAll("@","%40",channel)))

  var url = "https://slack.com/api/chat.postMessage?token=" + slackCreds.token + "&channel=" + cleanChannel +
    "&icon_url=http://i.imgur.com/dvbdUCE.png" + "&username=" + username + "&link_names=1&attachments=" + postText +
    messageEnd;

  // Show slack post URL
  stepState(6,true)

  // Makes HTTP POST
  var xhr = new XMLHttpRequest();

  xhr.open("POST", url, true),
  xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      // Show slack response
      var responseJSON = JSON.parse(xhr.responseText)

      if (responseJSON.ok == true) {
        stepState(7,true)
      } else {
        stepState(7,false)
        addErrorMessage("Error from Slack: " + responseJSON.error);
      }


    }
  }
  xhr.send();
}

// Function for posting to Hipchat
function postToHipchat(hcCreds, hipchats, pc) {

  // Posting to Hipchat
  stepState(8,true)

  // Encode room and create URL
  var encodedRoom = encodeURIComponent(hipchats),
      url = "https://www.hipchat.com/v2/room/" + encodedRoom  + "/notification?auth_token=" + hcCreds.token;

  // Append table text if box is selected
  if (pc.table == true) {
    resultText = makeTableFromResult(pc.data,"html");
    messageEnd = "<br><br><code>" + resultText + "</code>";
  } else {
    messageEnd = "";
  }

  // Add space below message
  if (pc.message != "") {
    fullMessage = pc.message + "<br><br>";
  } else {
    fullMessage = pc.message
  }

  // Body of message
  var messageContent = fullMessage + "<strong><a href='" + pc.link + "' >" + pc.title + "</a></strong><br>" + pc.desc +
    "<br>Run on " + dateSringFormat(pc.last_run) + messageEnd;

  var abbreviatedContent = messageContent.slice(0,9999)

  $.ajax({
    type: "POST",
    url: url,
    data: {
      "message": abbreviatedContent
    },
    error: function(response) {
      stepState(9,false)
      var errorMessage = "Hipchat failed to post. Please check that the room name is correct."
      addErrorMessage(errorMessage);
    }
   }).done(function(response) {
     if(! response){
        stepState(9,true)
      } else {
        stepState(9,false)
        var errorMessage = "Hipchat failed to post. Please check that the room name is correct."
        addErrorMessage(errorMessage);
      }
   });
}

// Function for posting message to Mailgun API
function sendEmail(mdCreds, emails, pc) {

  // Email subject
  var subject = "Mode report from " + mdCreds.name + ": " + pc.title;

  // Append table text if box is selected
  if (pc.table == true) {
    resultText = makeTableFromResult(pc.data,"html");
    messageEnd = "<br><br><code>" + resultText + "</code>";
  } else {
    messageEnd = "";
  }

  // Add break below message
  if (pc.message != "") {
    fullMessage = pc.message + "<br><br>";
  } else {
    fullMessage = pc.message
  }

  // Creates image object from chrome tab capture
  // imgString = "<br><img src='" + pc.img + "' />"

  // Body of message
  var messageContent = fullMessage + "<strong><a href='" + pc.link + "' >" + pc.title + "</a></strong><br>" + pc.desc +
    "<br>Run on " + dateSringFormat(pc.last_run) + messageEnd;

  // List of people to send it to
  var emailList = [];
  emails.split(",").forEach(function(e) { emailList.push( { "email": replaceAll(" ","",e), "type": "to" } ); })

  stepState(4,true);

  // Post email to Mandrill
  $.ajax({
    type: "POST",
    url: "https://mandrillapp.com/api/1.0/messages/send.json",
    data: {
      "key": mdCreds.key,
      "message": {
        "from_email": mdCreds.email,
        "from_name": mdCreds.name,
        "to": emailList,
        "autotext": "true",
        "subject": subject,
        "html": messageContent
      }
    },
    error: function() {
      stepState(5,false);
      var errorMessage = "Email failed to send. Please check that your Mandrill key is correct."
      addErrorMessage(errorMessage);
    }
   }).done(function(response) {

     if (response[0].status == "sent") {
       stepState(5,true);
     } else {
       stepState(5,false);

       var errorMessage = "Email failed to send. Please check that the email is valid."
       addErrorMessage(errorMessage);
     }
   });
}

// Gets post contents
function getPostContents(reportInfo,reportTokens,input) {

  if (reportInfo.title == undefined) {
    title = "Untitled Report";
  } else {
    title = reportInfo.title;
  }

  if (reportInfo.description == undefined) {
    description = "No description";
  } else {
    description = reportInfo.description;
  }

  var postContents = {
    "title": title,
    "desc": description,
    "last_run": reportInfo.last_run,
    "last_run_link": reportInfo.run_link,
    "message": input.message,
    "link": reportInfo.link,
    "img": reportTokens.image,
    "table": input.table
  }

  return postContents;

}

// Highlights selected schedule interval
function highlightInterval(id) {
  // Hide all pages
  if($("#interval-hourly").hasClass("active")){ $("#interval-hourly").removeClass("active");}
  if($("#interval-daily").hasClass("active")){ $("#interval-daily").removeClass("active");}
  if($("#interval-weekly").hasClass("active")){ $("#interval-weekly").removeClass("active");}

  $("#" + id).addClass("active");
}

// Shows the right time selector for the selected interval
function renderTimeSelectors() {
  var id = $(".interval-button.active").attr("id");

  // Hide unneeded options
  if (id == "interval-hourly") {
    if(!$("#day-span").hasClass("hide")){ $("#day-span").addClass("hide");}
    if(!$("#hour-span").hasClass("hide")){ $("#hour-span").addClass("hide");}
  } else if (id == "interval-daily") {
    if(!$("#day-span").hasClass("hide")){ $("#day-span").addClass("hide");}
    if($("#hour-span").hasClass("hide")){ $("#hour-span").removeClass("hide");}
  } else {
    if($("#day-span").hasClass("hide")){ $("#day-span").removeClass("hide");}
    if($("#hour-span").hasClass("hide")){ $("#hour-span").removeClass("hide");}
  }
}

// Creates schedule entry in local storage
function createScheduleEntry(reportTokens,input) {

  // Read credentials
  chrome.storage.local.get("credentials", function(data) {
    var cred = data.credentials;

    // This starts with the report endpoint
    var apiUrl = "https://modeanalytics.com/api/" + reportTokens.account +
        "/reports/" + reportTokens.token + "?embed%5Breport_runs%5D=1";

    // Make request
    $.ajax({
      type: "GET",
      url: apiUrl,
      data: { "username": cred.mode.username, "password": cred.mode.password }
    })
    .done(function(response) {
      // Parse response
      var reportInfo = getReportMetadata(response);

      // Create post Contents
      var entry = {
        "created_at": Date.now(),
        "last_sent": Date.now(),
        "new": true,
        "cron": {
          "interval": input.interval,
          "day": input.day,
          "hour": input.hour,
          "minute": input.minute,
          "catchup": input.catchup,
        },
        "report": {
          "name": reportInfo.title,
          "description": reportInfo.description,
          "url": reportInfo.link,
          "account": reportTokens.account,
          "token": reportTokens.token
        },
        "input": {
          "hipchats": input.hipchats,
          "emails": input.emails,
          "slacks": input.slacks,
          "message": input.message,
          "table": input.table
        }
      }

      // Post report info
      stepState(3,true)

      // Create schedule history in chrome storage
      chrome.storage.local.get("schedules", function(data) {

        entry["id"] = getLastSchduleId(data) + 1;

        var newSchedules = data.schedules.concat(entry),
        sortedSchedules = _.sortBy(newSchedules, function(d) { return -1 * d.created_at; });

        chrome.storage.local.set({"schedules": newSchedules}, function() {});
      });

    });
  })
}

// Function to retrieve data from Mode and post to appropriate channels
function getReportDetailsAndPost(reportTokens,input,shareType) {

  // Read credentials
  chrome.storage.local.get("credentials", function(data) {

    var cred = data.credentials;

    // This starts with the report endpoint
    var apiUrl = "https://modeanalytics.com/api/" + reportTokens.account +
        "/reports/" + reportTokens.token + "?embed%5Breport_runs%5D=1";

    // Make request
    $.ajax({
      type: "GET",
      url: apiUrl,
      data: { "username": cred.mode.username, "password": cred.mode.password }
    })
    .done(function(response) {
      // Parse response
      var reportInfo = getReportMetadata(response);

       // Create post Contents
      var postContents = getPostContents(reportInfo,reportTokens,input);

      // Get results and post
      getResultandPost(postContents, input, cred, shareType)
    });
  })
}

// If images are selected, get image from highcharts and post
function getResultandPost(postContents,input,credentials,shareType) {

  // This starts with the report endpoint
  var runApiUrl = postContents.last_run_link;

  // Make request
  $.ajax({
    type: "GET",
    url: "https://modeanalytics.com" + runApiUrl,
    data: { "username": credentials.mode.username, "password": credentials.mode.password }
  })
  .done(function(response) {
    // Parse response
    postContents["dataset_link"] = response["_links"]["json"]["href"];

    // Get dataset results, create image, and post
    getDatasetAndPost(postContents, input, credentials, shareType);

  });
}

// Get dataset from S3, get image from highcharts, and post
function getDatasetAndPost(postContents,input,credentials, shareType) {
  // This starts with the dataset endpoint
  var datasetLink = postContents.dataset_link;

  // Make request
  var xhr = new XMLHttpRequest();

  xhr.open("GET", datasetLink, true),
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {

      // Get response
      var responseJSON = JSON.parse(xhr.responseText)

      // Post report info
      stepState(3,true)

      postContents["data"] = responseJSON;

      if (input.hipchats.length > 0 ) { postToHipchat(credentials.hipchat, input.hipchats, postContents); }
      if (input.slacks.length > 0) { postToSlack(credentials.slack, input.slacks, postContents); }
      if (input.emails.length > 0) { sendEmail(credentials.mandrill, input.emails, postContents); }

      logToHistory(postContents,input.emails,input.slacks,input.hipchats,shareType)
    }
  }
  xhr.send();
}

// Returns object with name, description, and link
function getReportMetadata(js) {
  var reportName = js["name"],
      description = js["description"],
      url = js["_links"]["share"]["href"]
      chart_json = js["chart_view"],
      last_run_at = js["_embedded"]["report_runs"]["_embedded"]["report_runs"][0]["created_at"],
      run_link = js["_embedded"]["report_runs"]["_embedded"]["report_runs"][0]["_links"]["result"]["href"];

  return {"title":reportName,"description":description,"link": "https://modeanalytics.com" + url,
    "chart_json": chart_json, "last_run": last_run_at, "run_link": run_link };
}

// Helper replace all function
function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

// Post message with image to Slack
function postImageToSlack(slackCreds, channel, pc) {

  var url = "https://slack.com/api/files.upload?token=xoxp-2187025643-2187027153-3503407837-663b0c&channels=C02PQDH84&initial_comment="

  // Show slack post URL
  $("#slack-post").text(url)

  console.log(pc.img)

  $.ajax({
    type: "POST",
    url: url + "hey?",
    data: pc.img,
    contentType: "jpeg",
   }).done(function(response) {
     console.log(response)
   });

}

// Hide all pages except chosen one
function showPage(page) {
  // Hide all pages
  if(!$(".page#share-page").hasClass("hide")){ $(".page#share-page").addClass("hide");}
  if(!$(".page#history-page").hasClass("hide")){ $(".page#history-page").addClass("hide");}
  if(!$(".page#schedule-page").hasClass("hide")){ $(".page#schedule-page").addClass("hide");}
  if(!$(".page#settings-page").hasClass("hide")){ $(".page#settings-page").addClass("hide");}

  // Show selected page
  $(".page#" + page).removeClass("hide");
}

// Highlights chosen tab
function highlightTab(tab) {
  // Unhighlight all tabs
  if($(".share-tab").hasClass("active")){ $(".share-tab").removeClass("active");}
  if($(".history-tab").hasClass("active")){ $(".history-tab").removeClass("active");}
  if($(".schedule-tab").hasClass("active")){ $(".schedule-tab").removeClass("active");}
  if($(".settings-tab").hasClass("active")){ $(".settings-tab").removeClass("active");}

  // Highlight selected tab
  $("." + tab).addClass("active");
}

// Show schedule list
function showSchedules() {

  // Hide detail page and show list page
  if(!$(".schedule-list-items").hasClass("hide")){ $(".schedule-list-items").addClass("hide");}
  if(!$(".schedule-detail").hasClass("hide")){ $(".schedule-detail").addClass("hide");}
  $(".schedule-list-items").removeClass("hide");

  // Clear history
  $(".schedule-list-items").empty();

  chrome.storage.local.get("schedules", function(data) {

    var json = data.schedules;

    var sortedList = _.sortBy(json, function(d) { return -1 * d.created_at; });

    // Corrects empty state
    if (sortedList.length == 0) {
      $(".schedule-list-items").html("<p class='empty-message'>There are no schedules yet!</p>");
    } else {
      sortedList.forEach(function(js) {
        drawScheduleItem(js)
      })
    }

  })
}

// Draw individual schedule item
function drawScheduleItem(js) {

  // Get details
  var url = js.report.url,
      title = js.report.name;

  // Draw div
  var div = $(".schedule-list-items");

  div.append(
    $("<div/>", {"class": "schedule-item"})
          .append( $("<p/>", {
            "class": "schedule-item-text",
            html: "<a class='hi-title' href='" + url + "'>" + title + "</a><br>" +
            "<span class='hi-date'>Created " + formatDateText(js.created_at) + "</span>"
          }) )
  );

  div.append(
    $("<button/>", {"class": "schedule-show-detail secondary-button",
      "id": "detail-" + js.id,
      "html":"SHOW"
    }) )
}

// Shows schedule detail page
function showScheduleDetailById(n) {

  // Hide schedule list and show detail page
  if(!$(".schedule-list-items").hasClass("hide")){ $(".schedule-list-items").addClass("hide");}
  if(!$(".schedule-detail").hasClass("hide")){ $(".schedule-detail").addClass("hide");}
  $(".schedule-detail").removeClass("hide");


  chrome.storage.local.get("schedules", function(data) {

    var full = data.schedules,
        detail = _.where(full, {"id":n})

    renderScheduleDetail(detail[0]);
  })
}

// Renders detail information about each schedule
function renderScheduleDetail(js) {

  // Function for leading zerors
  var z = d3.format("02d");

  // Draw div
  $("#detail-title").html("<a href='" + js.report.url + "'>" + js.report.name + "</a>")
  $("#detail-description").text(js.report.description)

  // Add phrase based on interval
  var int = js.cron.interval;

  if (int == "interval-hourly") {
    $("#detail-interval").text("Hourly at " + js.cron.minute + " minutes past the hour");
  } else if (int == "interval-daily") {
    $("#detail-interval").text("Daily at " + js.cron.hour + ":" + z(js.cron.minute));
  } else if (int == "interval-weekly") {
    $("#detail-interval").text("Weekly on " + js.cron.day + " at " + js.cron.hour + ":" + z(js.cron.minute));
  }

  $("#detail-slack").text(js.input.slacks)
  $("#detail-email").text(js.input.emails)
  $("#detail-hipchat").text(js.input.hipchats)
  $("#detail-message").text(js.input.message)

  if (js.new == true) {
    $("#detail-last-sent").text("Not sent yet")
  } else {
    $("#detail-last-sent").text(formatDateText(js.last_sent))
  }


  $(".schedule-delete").attr("id","sd-" + js.id)

}

// Show history list
function showHistory() {
  chrome.storage.local.get("history", function(data) {

    var json = data.history;

    var sortedList = _.sortBy(json, function(d) { return -1 * d.date; });
    // var trimmed = sortedList.slice(0,20);

    // Clear history
    $(".share-list-items").empty();

    // Corrects empty state
    if (sortedList.length == 0) {
      $(".share-list-items").html("<p class='empty-message'>There is no share history yet!</p>");
    } else {
      sortedList.forEach(function(js,i) {
        drawHistoryItem(js,i)
      })
    }
  })
}

// Draw individual history item
function drawHistoryItem(js,i) {

  // Draw div
  var div = $(".share-list-items");

  div.append(
    $("<div/>", {"class": "share-item " + js.share_type, "id": "share-item-id-" + i})
          .append( $("<p/>", {
            "class": "share-item-text",
            html: "<a class='hi-title' href='" + js.report.url + "'>" + js.report.name + "</a> " +
              "<span class='hi-date'>" + formatDateText(js.date) + "</span>"
          }) )
  );

  var shareDiv = $("#share-item-id-" + i)

  // Email list
  if (js.channels.emails[0] != "") {
    shareDiv.append( $("<p/>", {
              "class": "share-item-text hi-email",
              html: "Emails: " + addListsOfChannelsToHistory(js.channels.emails)
            }) )
  }

  // Slack list
  if (js.channels.slacks[0] != "") {
    shareDiv.append( $("<p/>", {
              "class": "share-item-text hi-slack",
              html: "Slack channels: " + addListsOfChannelsToHistory(js.channels.slacks)
            }) )
  }

  // Hipchat list
  if (js.channels.hipchats[0] != "") {
    shareDiv.append( $("<p/>", {
              "class": "share-item-text hi-hipchat",
              html: "Hipchat rooms: " + addListsOfChannelsToHistory(js.channels.hipchats)
            }) )
  }
}

// Figure out how to make shared list
function addListsOfChannelsToHistory(items) {

  // Start with blank string
  var string = ""

  if (items.length <=3) {
    // Append emails and return trimmed strings
    items.forEach(function(i,n) {
      if (n == 0) { string = string + i; } else { string = string + ", " + i; }
    })
    return string.trim()

  } else {
    // Get first emails and count hoomw any are left
    var firstItems = items.slice(0,3);
    var remainder = items.length - 3;

    firstItems.forEach(function(i,n) {
      if (n == 0) { string = string + i; } else { string = string + ", " + i; }
    })

    string = string + " + " + remainder;
    return string.trim();
  }
}

// Save share to local storage
function logToHistory(postContents,emails,slacks,hipchats,shareType) {

  // Get current history from local storage
  chrome.storage.local.get("history", function(data) {

    // Get last Id
    var lastId = getLastId(data),
        report = {
          "url":postContents.link,
          "name":postContents.title,
        },
        emailList = emails.split(","),
        slackList = slacks.split(","),
        hipchatList = hipchats.split(","),
        message = postContents.message,
        date = Date.now()

    var entry =
        {
          "id": lastId + 1,
          "report": report,
          "channels": {
            "emails": emailList,
            "slacks": slackList,
            "hipchats": hipchatList
          },
          "message":message,
          "date": date,
          "share_type":shareType
        };

    var newHistory = data.history.concat(entry),
        sortedHistory = _.sortBy(newHistory, function(d) { return -1 * d.date; });

    chrome.storage.local.set({"history": sortedHistory}, function() {});
  });
}

// Gets last id from history
function getLastId(hist) {

  if (hist.history.length == 0) {
    return 0;
  } else {
    var idList = _.pluck(hist.history, "id");
    return _.max(idList);
  }
}

// Gets last id from schedules
function getLastSchduleId(data) {

  if (data.schedules.length == 0) {
    return 0;
  } else {
    var idList = _.pluck(data.schedules, "id");
    return _.max(idList);
  }
}

// Formatted epoch date into string
function formatDateText(epoch) {

  var dateOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"};

  var dateObj = new Date(epoch),
      formattedDate = dateObj.toLocaleTimeString("en-us",dateOptions);

  return formattedDate;
}

// Format runtime string
function dateSringFormat(string) {
  var dateOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"};

  var dateObj = new Date(string),
      formattedDate = dateObj.toLocaleTimeString("en-us",dateOptions);

  return formattedDate;
}

// Delete schedule from local history by Id
function deleteScheduleById(id) {

  var newSchedules = [];

  // Get current schedules
  chrome.storage.local.get("schedules", function(data) {

    data.schedules.forEach(function(s) {
      if (s.id != id) { newSchedules.push(s); }
    })

    // Create new schedule list
    chrome.storage.local.set({"schedules": newSchedules}, function() {
      // Redraw schedules
      showSchedules();
    });
  });
}

// Draw status indicator SVG
function drawStatusIndicator() {

  // Steps to pass through
  var steps = [
    {"text":"Getting URL","number":1},
    {"text":"Checking inputs","number":2},
    {"text":"Got report info","number":3},
    {"text":"Posting to email","number":4},
    {"text":"Success posting to email","number":5},
    {"text":"Posting to Slack","number":6},
    {"text":"Success posting to Slack","number":7},
    {"text":"Posting to Hipchat","number":8},
    {"text":"Success posting to Hipchat","number":9},

  ]

  var svgHeight = steps.length * 20 + 10;
  var leftPadding = 20

  // Draw SVG for steps
  var svg = d3.select(".status").append("svg")
      .attr("height",svgHeight)
      .attr("width",200)
      .style("float","left")

  // Text
  svg.selectAll(".step-text")
      .data(steps)
    .enter().append("text")
      .attr("class","step-text")
      .attr("id",function(d) { return "st-" + d.number; })
      .attr("x",leftPadding + 10)
      .attr("y",function(d,i) { return i * 20 + 10; })
      .attr("dy", ".35em")
      .text(function(d) { return d.text; });

  // Lines, except for last step
  svg.selectAll(".step-line")
      .data(steps)
    .enter().append("line")
      .attr("class","step-line")
      .attr("id",function(d) { return "sl-" + d.number; })
      .attr("x1",leftPadding)
      .attr("x2",leftPadding)
      .attr("y1",function(d,i) { return i * 20 + 10; })
      .attr("y2",function(d,i) {
        if (i == 0) {
          return i * 20 + 10;
        } else {
          return i * 20 - 10;
        }
      });

  // Dots
  svg.selectAll(".step-dot")
      .data(steps)
    .enter().append("circle")
      .attr("class","step-dot")
      .attr("id",function(d) { return "sd-" + d.number; })
      .attr("cx",leftPadding)
      .attr("cy",function(d,i) { return i * 20 + 10; })
      .attr("r",4);

  // Append div to the right of status box
  d3.select(".status")
      .append("div")
      .attr("class","error-box")
}

// Highlights status step with right color
function stepState(stepNumber,succeeded) {
  if (succeeded == true) {
    color = successColor;
  } else {
    color = failureColor;
  }

  d3.select("#st-" + stepNumber).style("fill",color);
  d3.select("#sd-" + stepNumber).style("fill",color);
  d3.select("#sl-" + stepNumber).style("stroke",color);
}

// Clears all status steps
function resetIndicators() {
  // Reset colors
  d3.selectAll(".step-text").style("fill","#BDBFC5");
  d3.selectAll(".step-dot").style("fill","#BDBFC5");
  d3.selectAll(".step-line").style("stroke","#BDBFC5");

  // Clear error box
  $(".error-box").empty();
}

// Add error message to error box
function addErrorMessage(message) {
  d3.select(".error-box")
    .append("p")
    .text(message);
}

// Fills settings with current values
function fillSettings() {
  // Hide validation box
  if(!$(".settings-validation-container").hasClass("hide")){ $(".settings-validation-container").addClass("hide");}

  // Get settings from storage
  chrome.storage.local.get("credentials", function(data) {

    var cred = data.credentials

    $("#mode-account").val(cred.mode.username);
    $("#mode-password").val(cred.mode.password);

    $("#slack-username").val(cred.slack.username);
    $("#slack-token").val(cred.slack.token);

    $("#mandrill-key").val(cred.mandrill.key);
    $("#mandrill-name").val(cred.mandrill.name);
    $("#mandrill-email").val(cred.mandrill.email);

    $("#hipchat-token").val(cred.hipchat.token);
  })
}

// Saves current settings
function saveSettings() {

  var modeUser = $("#mode-account").val(),
      modePass = $("#mode-password").val(),
      slackUser = $("#slack-username").val(),
      slackToken = $("#slack-token").val(),
      hipchatToken = $("#hipchat-token").val(),
      mandKey = $("#mandrill-key").val(),
      mandName = $("#mandrill-name").val(),
      mandEmail = $("#mandrill-email").val();

  cred = {
    "mode": {
      "username": modeUser,
      "password": modePass,
    },
    "slack": {
      "username": slackUser,
      "token": slackToken
    },
    "mandrill": {
      "key": mandKey,
      "name": mandName,
      "email": mandEmail
    },
    "hipchat": {
      "token": hipchatToken
    }
  }

  chrome.storage.local.set({"credentials": cred}, function() {});
}

// Show validation div and check credentials
function checkCredentials() {
  // Show validation div
  if($(".settings-validation-container").hasClass("hide")){ $(".settings-validation-container").removeClass("hide");}

  // Check Slack
  validateSlack($("#slack-token").val())
  validateHipchat($("#hipchat-token").val())
  validateMandrill($("#mandrill-key").val())
  validateMode($("#mode-account").val(),$("#mode-password").val())


}

// Validates Slack token
function validateSlack(slackToken) {

  $.ajax({
    type: "GET",
    url: "https://slack.com/api/auth.test?token=" + slackToken
   }).done(function(response) {

     if (response.ok == true) {
       $("#slack-validation").text("Your Slack token is valid!").css("color",successColor)
     } else {
       $("#slack-validation").text("Your Slack token is invalid!").css("color",failureColor)
     }
   });
}

// Validates Slack token
function validateMandrill(mandrillKey) {

  // Get to Mandrill
  $.ajax({
    type: "GET",
    url: "https://mandrillapp.com/api/1.0/users/ping.json",
    data: {
      "key":mandrillKey
    },
    // Write error if bad response
    error: function() {
      $("#mandrill-validation").text("Your Mandrill key is invalid!").css("color",failureColor)
    }
  }).done(function(response) {

    if (response == "PONG!") {
      $("#mandrill-validation").text("Your Mandrill key is valid!").css("color",successColor)
    } else {
      $("#mandrill-validation").text("Your Mandrill key is invalid!").css("color",failureColor)
    }
  });
}

// Validates Hipchat token
function validateHipchat(hipchatToken) {

  $.ajax({
    type: "GET",
    url: "https://api.hipchat.com/v2/room?auth_token=" + hipchatToken,
    error: function(response) {
      $("#hipchat-validation").text("Your Hipchat token is invalid!").css("color",failureColor)
    }
   }).done(function(response) {
      $("#hipchat-validation").text("Your Hipchat token is valid!").css("color",successColor)
   });
}

// Validate Mode username and password
function validateMode(username,password) {

  var url = "https://modeanalytics.com/api/" + username;

  // Make request
  $.ajax({
    type: "GET",
    url: url,
    data: { "username": username, "password": password },
    error: function() {
      $("#mode-validation").text("Your Mode username or password is invalid!").css("color",failureColor)
    }
  })
  .done(function(response) {
    if ("username" in response) {
      $("#mode-validation").text("Your Mode username and password are valid!").css("color",successColor)
    } else {
      $("#mode-validation").text("Your Mode username or password is invalid!").css("color",failureColor)
    }
  })
}

// Makes a plain-text table from the result
function makeTableFromResult(dataset,textType) {

  // Sets break and space characters depending on post type
  if (textType == "html") {
    breakType = "<br>";
    spaceType = "&nbsp;";
  } else if (textType == "url") {
    breakType = "%0A";
    spaceType = " ";
  }

  // Create empty string
  var table = ""

  // Get headers
  var headers = Object.keys(dataset[0]),
      colWidth = {};


  headers.forEach(function(h) {
    // Set max length
    var vals = _.pluck(dataset,h);
    var maxLength = h.length;

    // Change max length for each value
    vals.forEach(function(i) {
      if (String(i).length > maxLength) {
        maxLength = String(i).length;
      }
    })

    // Set max length for each column
    colWidth[h] = maxLength;

    // Make header
    var header = "|" + spaceType + h + Array(maxLength - h.length + 1).join(spaceType) + spaceType;
    table = table + header;
  })

  // Create new table row
  table = table + "|" + breakType

  // Loop through data
  dataset.forEach(function(row,i) {
    if (i < 25) {
      headers.forEach(function(h) {
        var value = row[h];
        var maxLength  = colWidth[h]

        // Make entry
        var entry = "|" + spaceType + String(value) + Array(maxLength - String(value).length + 1).join(spaceType) + spaceType;

        table = table + entry;
      })
    table = table + "|" + breakType;
    }
  })

  return table
}
