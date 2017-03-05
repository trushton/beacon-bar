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

var groups = [ 'Immediate','Near','Far', 'Unknown'];
$(document).ready(function() {
    console.log("document ready");

    datatable = $('#devices').dataTable( {
        "data": devices,
        "order": [[ 0, 'asc' ]],
        "autoWidth":false,
        "columnDefs": [
            { "visible": false, "targets": 0 }
        ],
        "dom": '<"DTReportSettings"TC><"clear">t',
        "columns": [
            { "title": "Proximity Enum", "data":"proximity" },
            { "title": "Name", "data":"data.name", "className":"nameColumn" },
            { "title": "Locator", "data": "data.recordLocator", "className": "locatorColumn" },
            { "title": "RSSI", "data":"rssi", "className": "rssiColumn" },
            { "title": "Last Seen","data":"lastSeen", "className":"seenColumn" }
        ],
        "drawCallback": function ( settings ) {
            var api = this.api();
            var rows = api.rows( {page:'current'} ).nodes();
            var last=null;

            api.column(0, {page:'current'} ).data().each( function ( group, i ) {
                if ( last !== group ) {
                    $(rows).eq( i ).before(
                        '<tr class="group"><td colspan="5">'+groups[group]+'</td></tr>'
                    );

                    last = group;
                }
            } );
            if(selectedRowId != false && selectedRowId.substr(0,2) == "NA") { // Can only send message to NewAer devices
                $('.newAerButton').prop('disabled',false);
            } else {
                $('.newAerButton').prop('disabled',true);
            }
        },
        "rowCallback": function( row, data ) {
//            console.log("Checking row "+data.deviceId+" against selected: "+selectedRowId);
            if ( data.deviceId == selectedRowId) {
                $(row).addClass('selected');
            }
        }
    } );

    $('#devices tbody').on('click', 'tr', function () {
        var id = this.id;
        if(selectedRowId == id) {
            selectedRowId = false;
        } else {
            if(selectedRowId != false) {
                $(datatable.api().row('#' + selectedRowId).node()).toggleClass('selected');
            }
            selectedRowId = id;
        }
        $(this).toggleClass('selected');

    } );


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
//    console.log("Update called with devicesPresent: "+devicesPresent);
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
        localStorage.setItem("currentDevice", parseId(devices[highDeviceId].data));
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
//    console.log("Updating device: "+device.deviceId);
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
    row = datatable.api().row('#'+device.deviceId);
    row.data(device).draw();
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