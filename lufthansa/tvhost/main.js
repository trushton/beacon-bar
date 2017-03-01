var firstLaunch = true;

App.onLaunch = function(options) {
    var javascriptFiles = [
        options.BASEURL+"ResourceLoader.js",
        options.BASEURL+"PageHandler.js"
    ];

    evaluateScripts(javascriptFiles, function(success) {
        if (success) {
            console.log("Finished eval scripts");
            pageHandler = new PageHandler(options);
            pageHandler.updateState(KioskState.STATE_NODEVICES);
        } else {
            /*
            Be sure to handle error cases in your code. You should present a readable, and friendly
            error message to the user in an alert dialog.

            See alertDialog.xml.js template for details.
            */
            var alert = createAlert("Evaluate Scripts Error", "There was an error attempting to evaluate the external JavaScript files.\n\n Please check your network connection and try again later.");
            navigationDocument.presentModal(alert);

            throw ("Playback Example: unable to evaluate scripts.");
        }
    });
}


/**
 * This convenience funnction returns an alert template, which can be used to present errors to the user.
 */
var createAlert = function(title, description) {

    var alertString = `<?xml version="1.0" encoding="UTF-8" ?>
        <document>
          <alertTemplate>
            <title>${title}</title>
            <description>${description}</description>
<button><text>OK</text></button>
          </alertTemplate>
        </document>`

    var parser = new DOMParser();

    var alertDoc = parser.parseFromString(alertString, "application/xml");

    return alertDoc
}
 
App.onExit = function() {
  console.log('App finished');
}

