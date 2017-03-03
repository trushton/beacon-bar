var devices = null;
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
    var deviceDbRecord = firebase.database().ref('users/'+ parseId(device.data));
    console.log("Updating device: "+device.deviceId);
    devices[device.deviceId] = device;

    deviceDbRecord.once('value').then(function(currentRecord){
        deviceDbRecord.update({
            barTime: (currentRecord.child('barTime').val() + 1)
        })
    })
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

var drinks = {
    "vodka": {
        "Walmart Blue": {
            "name": "Walmart Blue",
            "ingredients": ["Vodka", "Lemonade", "Blue Cuacao"]
        },
        "Moscow Mule": {
            "name": "Moscow Mule",
            "ingredients": ["Vodka", "Gingerbeer", "Lime"]
        },
        "Texas Sipper": {
            "name": "Texas Sipper",
            "ingredients": ["Vodka", "St. Germaine", "Grapefruit Juice", "Mint", "Topo Chico"]
        }
    },
    "whiskey": {
        "Walmart Yellow": {
            "name": "Walmart Yellow",
            "ingredients": ["Whiskey", "Sweet N Sour"],
            "fact": "TX Blended Whiskey is made over in Fort Worth, TX"
        },
        "Texas Tea": {
            "name": "Texas Tea",
            "ingredients": ["Whiskey", "Sweet Tea", "Pomegranate Juice"]
        }
    },
    "beer": {
        "Shiner": {
            "name": "Shiner",
            "type": "dark option"
        },
        "Fireman's 4": {
            "name": "Fireman's 4",
            "type": "light option"
        }
    },
    "red wine": {
        "Pinot Noir": {
            "name": "Pinot Noir",
            "type": "Mark West"
        },
        "Merlot": {
            "name": "Merlot",
            "type": "Mark West"
        }
    },
    "white wine": {
        "Chenin Blanc": {
            "name": "Chenin Blanc",
            "type": "Llano Estacado"
        }
    }
};

(function(){
    var database = firebase.database();
    var ref = database.ref('users/');
    var badgeId = localStorage.getItem("currentDevice");


    ref.once('value').then(function(snapshot) {
        if (snapshot.hasChild(badgeId)) {
            var user = snapshot.child(badgeId);
            var name = user.child('username').val();
            var drink_pref = user.child('drink_pref').val();
            var recommendation = recommendDrink(drink_pref);

            $('#suggestion').html("<h3>Hi there " + name + ", how about a " + recommendation.name + " seeing as you like " + drink_pref + ".</h3>");

            database.ref('users/'+badgeId).update({
                barCount: (user.child('barCount').val()+1),
                prevRecommendation: recommendation.name
            });
        }
        else{
            $('#notFound').html("<h3>I'm sorry, I don't recognize you. Perhaps you need to sign up at the registration kiosk?</h3>");
        }
    });
})();

function recommendDrink(preference){
    console.log(preference);
    var keys = Object.keys(drinks[preference]);
    return drinks[preference][keys[keys.length * Math.random() <<0]];
}
