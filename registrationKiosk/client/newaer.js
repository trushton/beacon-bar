$(function () {
    console.log("jquery start");
    $('#saveButton').click(function() {
        console.log("Clicked save button");
        var configObject = { };
        configObject.name = $('#name').val();
        configObject.recordLocator = $('#recordLocator').val();
        saveConfig(configObject);
    });
});

function NAUpdate(devicesPresent)
{
    console.log("Update called with devicesPresent: "+devicesPresent);
}

function saveConfig(configObject)
{
    _json = encodeURIComponent(JSON.stringify(configObject));
    console.log("Saving configuration "+_json);
    window.location = 'nakiosk://config/?config='+_json;
}

function NASetConfig(config) {
    console.log("setConfig called with: "+config);
    $('#name').val(config.name);
    $('#recordLocator').val(config.recordLocator);
}