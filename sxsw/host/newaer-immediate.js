var devices = null;
var selectedRowId = false;


$(function () {
    console.log("jquery start");
    urlQuery = parse_query_string(window.location.href);
    $('#logSection').html("Log");
    console.log("urlQuery: "+JSON.stringify(urlQuery));
    if(urlQuery['kioskIdentifier']) {
        $('#kioskIdentifier').text(urlQuery['kioskIdentifier']);
    }
});

$(document).ready(function() {
    console.log("document ready");
});

var groups = [ 'Immediate','Near','Far', 'Unknown'];

function parse_query_string(string)
{
    if (string == "") return {};
    page = string.replace(/\?.*/,'');
    a = string.replace(/.*\?/,'').split('&');

    console.log("parsing: "+a);
    var b = {};
    for (var i = 0; i < a.length; ++i)
    {
        var p=a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    b['page'] = page;
    return b;
}

var highRssi;
var highDeviceId;

function NAUpdate(devicesPresent)
{
    console.log("Update called with devicesPresent: "+devicesPresent);
    unescape(devicesPresent);

    // Update
    for (var key in devices) {
        if(devicesPresent.hasOwnProperty(key)) {
            // Update device
            updateDevice(devicesPresent[key]);
        } else {
            // Remove device
            removeDevice(devices[key]);
        }
    }

    // Add
    for (var key in devicesPresent) {
        if (devices == null || devices.hasOwnProperty(key) == false) {
            addDevice(devicesPresent[key]);
        }
    }

    // Find strongest
    highRssi = -100;
    for (var key in devices) {
        if(devices[key].rssi > highRssi) {
            highRssi = devices[key].rssi;
            highRssi = highRssi;
            highDeviceId = key;
        }
    }

    if(highDeviceId != "") {
        $('#deviceName').text(devices[highDeviceId].data.name);
        window.localStorage.setItem("currentDevice", '1:70');
        $('#locator').text('local-storage:' + window.localStorage + '\n' +devices[highDeviceId].data.recordLocator);
    }
}


function parseId(data){
    if (typeof data.major !== 'undefined' && typeof data.minor !== 'undefined') {
        var minor;

        if(data.minor < 10){
            minor = '00' + data.minor.toString();
        } else if(data.minor < 100){
            minor = '0' + data.minor.toString();
        } else { minor = data.minor.toString(); }

        return data.major.toString() + minor;
    }
}

function updateDevice(device)
{
    console.log("Updating device: "+device.deviceId);
    devices[device.deviceId] = device;
}

function removeDevice(device)
{
    delete devices[device.deviceId];
}

function addDevice(device)
{
    if(devices == null) devices = Object;
    if(typeof device.data === 'undefined' || typeof device.data.name === 'undefined') {
        device.data.name = device.name;
    }
    if(typeof device.data === 'undefined') {
        device.data.recordLocator = "";
    } else {
        if(typeof device.data.recordLocator === 'undefined') {
            if (typeof device.data.major === 'undefined' && typeof device.data.minor === 'undefined') {
                device.data.recordLocator = "";
            } else {
                device.data.recordLocator = device.data.major + ":" + device.data.minor;
            }
        }
    }
    devices[device.deviceId] = device;
}

function sendMessage(deviceId, cta, url)
{
    console.log("Sending message to "+deviceId);
    console.log(" with cta: "+cta);
    console.log(" and url: "+url);
    _url = encodeURIComponent(url);
    _cta = encodeURIComponent(cta);
    window.location = 'nakiosk://message/'+deviceId+'?cta='+_cta+'&url='+_url;
}

