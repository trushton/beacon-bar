var devices = null;
var selectedRowId = false;


$(function () {
});

var groups = [ 'Immediate','Near','Far', 'Unknown'];

$(document).ready(function() {
    console.log("document ready");
});

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

    if(highDeviceId != "" && $('.param_name').length) {
        $('.param_name').text(devices[highDeviceId].data.name);
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

function messageSendCoupon()
{
  url = "https://staging.newaer.com/dtad/sink/Coupon.pkpass";
  cta = "Get Coupon";
  sendMessage(highDeviceId, cta, url);
}

