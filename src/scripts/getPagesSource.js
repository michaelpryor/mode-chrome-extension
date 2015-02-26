function getREP(document_root) {
  
  var rep = document_root.getElementsByName("report-entry-path"),
      content = rep[0].content;
  
  return content;
}

chrome.extension.sendMessage({
    action: "getAccount",
    source: getREP(document)
});