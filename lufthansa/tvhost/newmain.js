
function updateDeviceName(value) {
    console.log("updateDeviceName: "+value);
    getActiveDocument().getElementById('deviceName').textContent = value;
}
function updateRSSI(value) {
    console.log("updateRSSI: "+value);
    getActiveDocument().getElementById('signalStrength').textContent = value;
}

 
App.onLaunch = function(options) {
    var javascriptFiles = [
        `${options.BASEURL}ResourceLoader.js`];

       evaluateScripts(javascriptFiles, function(success) {
        if (success) {
            console.log("Finished eval scripts");
            resourceLoader = new ResourceLoader(options.BASEURL);

            var index = resourceLoader.loadResource(`${options.BASEURL}main.xml.js`,
                function(resource) {
                    console.log("loaded main.xml.js");
                    var doc = makeDocument(resource);
                    doc.addEventListener("select", function(event) {
                        reloadApp();
                    });
                    navigationDocument.presentModal(doc);

                });
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
<button><text>Test</text></button>
<button><text>Test2</text></button>
          </alertTemplate>
        </document>`

    var parser = new DOMParser();

    var alertDoc = parser.parseFromString(alertString, "application/xml");

    return alertDoc
}
 
App.onExit = function() {
  console.log('App finished');
}

function makeDocument(resource) {
    parser = new DOMParser();

    var doc = parser.parseFromString(resource, "application/xml");
    return doc;
}
