var datatable;
var devices = null;
var deviceArray = [];
var selectedRowId = false;


$(function () {
    console.log("jquery start");
    urlQuery = parse_query_string(window.location.href)
    $('#logSection').html("Log");
    console.log("urlQuery: "+JSON.stringify(urlQuery));
    if(urlQuery['kioskIdentifier']) {
        $('#kioskIdentifier').text(urlQuery['kioskIdentifier']);
    }
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
            highDeviceId = key;
        }
    }

    if(highDeviceId != "") {
        localStorage.setItem("currentDevice", devices[highDeviceId].data.recordLocator);
    }
}

function updateDevice(device) {
    var deviceDbRecord = firebase.database().ref('users/'+ parseId(device.data));
    var badge = parseId(device.data);

    devices[device.deviceId] = device;

    deviceDbRecord.once('value').then(function(currentRecord){
        firebase.database().ref('vrQueue/').once('value').then(function(vrQueue){
           if(!vrQueue.hasChild('badge')) {
               if(device.rssi > -70){
                   deviceDbRecord.update({ vrEnqueueTimer: (currentRecord.child('vrEnqueueTimer').val() + 1) });
                   if(currentRecord.child('vrEnqueueTimer').val() > 30){
                       firebase.database().ref('vrQueue/' + badge).update({
                           timeEntered: Date.now()
                       });
                       deviceDbRecord.update({ vrEnqueueTimer: 0 });
                   }
               }
               else{
                   deviceDbRecord.update({ vrEnqueueTimer: 0 });
               }
           }
        });
    })

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

function removeDevice(device)
{
//    console.log("Removing device: "+device.deviceId);
    delete devices[device.deviceId];
    datatable.api().row('#'+device.deviceId).remove().draw();
}

function addDevice(device)
{
//    console.log("Adding device: "+device.deviceId);
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
    rowNode = datatable.api().row.add(device).draw().node();
    $(rowNode).attr('id',device.deviceId);
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
