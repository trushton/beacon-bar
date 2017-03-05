var devices = null;
var selectedRowId = false;
var proximityLock = false;


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
    if(!proximityLock){
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
                highDeviceId = key;
            }
        }

        if(highDeviceId != "") {
            var badge = localStorage.currentDevice = parseId(devices[highDeviceId].data);

            var ref = firebase.database().ref('users/');
            ref.once('value').then(function(snapshot){
                if(snapshot.hasChild(badge) ) {
                    var user = snapshot.child(badge);

                    document.getElementById('device').style.display = 'none';

                    $("#returnVisit").html(
                        "<img id='userImage' src='" + user.child('picture').val() + "'>" +
                        "<div id='returnBanner'>" +
                        "<p>Welcome back to the VIP lounge " + user.child('username').val() + "!</p>" +
                        "<p>You've been here " + (user.child('visitCount').val() + 1) + " times.</p>" +
                        "</div>"
                    );
                    if(snapshot.child(badge).child('lastSeen').val() < (Date.now()-240000)){
                        firebase.database().ref('users/' + badge).update({lastSeen: Date.now(), visitCount: user.child('visitCount').val() + 1});
                    }
                }
            });
        }
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
