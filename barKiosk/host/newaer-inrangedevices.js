var datatable;
var devices = null;
var deviceArray = [];
var selectedRowId = false;
var guestRotationTime = 0;
var highDeviceId;

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
    if((Date.now() - 10000) > guestRotationTime){
      for (var key in devices) {
          if(devices[key].rssi > highRssi) {
              highRssi = devices[key].rssi;
              highDeviceId = key;
              guestRotationTime = Date.now();
          }
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
    devices[device.deviceId] = device;

    deviceDbRecord.once('value').then(function(currentRecord){
        deviceDbRecord.update({
            barTime: (currentRecord.child('barTime').val() + 1)
        });
    });
}

function removeDevice(device)
{
//    console.log("Removing device: "+device.deviceId);
    delete devices[device.deviceId];
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

}


(function(){
    displayGuest();
})();


function displayGuest(){
    var database = firebase.database();
    var ref = database.ref('users/');
    var badgeId = localStorage.currentDevice;

    ref.once('value').then(function(snapshot) {

        var htmlz;

        if (snapshot.hasChild(badgeId)) {
            var user = snapshot.child(badgeId);
            var guestSource = $('#guest-template').html();
            var guestTemplate = Handlebars.compile(guestSource);

            htmlz = guestTemplate({
                guestName: user.child('firstName').val(),
                guestImage: user.child('picture').val(),
                visitCount: user.child('barCount').val(),
                drinkPref: user.child('drink_pref').val()
            });

            var socialSource = $('#guest-social-template').html();
            var socialTemplate = Handlebars.compile(socialSource);
            checkForFriends(badgeId).then(function(friendsAtBar){
                getFriendData(friendsAtBar).then(function(friendData){
                    var names = [];
                    for(var friend of friendData){
                        names.push(friend.name);
                    }
                    socialHtml = socialTemplate({
                        friendNames: names.join(),
                        friend1_img: checkForPicture(friendData, 0),
                        friend2_img: checkForPicture(friendData, 1),
                        friend3_img: checkForPicture(friendData, 2)
                    });
                    $('[data-guest-social]').html(socialHtml);
                });
            });
        }
        else {
            var source = $('#not-found-template').html();
            htmlz = Handlebars.compile(source);
        }

        $('[data-guest-highlight]').html(htmlz);

    });

    setTimeout(function(){
        displayGuest();
    }, 10000);
}

function checkForPicture(data, index){
    if(data[index]){
        return data[index].picture
    }
}


function checkForFriends(badgeId){
    var friends = firebase.database().ref('friends/' + badgeId);
    var peopleInBar = [];
    var friendsAtBar = [];

    for (var key in devices) {
        if(devices[key].data.recordLocator){
            peopleInBar.push(parseId(devices[key].data));
        }
    }

    return friends.once('value').then(function(friendsList){
        friendsList.forEach(function(friend){
            if(peopleInBar.includes(friend.val().toString())){
                friendsAtBar.push(friend.val().toString());
            }
        });
        return friendsAtBar;
    });
}


function getFriendData(friends){
    var usersRef = firebase.database().ref('users/');
    var friendData =[];

    return usersRef.once('value').then(function(users){
       for(var friend of friends){
           var friendObj = users.child(friend);
           friendData.push({name: friendObj.child('firstName').val(),
                            picture: friendObj.child('picture').val()});
       }
       return friendData;
    });

}

