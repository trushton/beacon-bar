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

function displayGraph(){
    var socialGraphSource = $('#social-graph-template').html();
    var sourceTemplate = Handlebars.compile(socialGraphSource);

    getPeopleSubset(6).then(function(userSubset){
        if(userSubset.length < 2) {
          var context = {
            people: userSubset
          };

          console.log(sourceTemplate(context));

          $('#social-graph').html(sourceTemplate(context));
        } else {

          var peoplePairs = createPairs(userSubset);

          var context = {
            people: userSubset,
            commonalities: findCommonalities(peoplePairs)
          };

          console.log(context);

          console.log(sourceTemplate(context));

          $('#social-graph').html(sourceTemplate(context));
        }
    });
}

// Searches likes, etc and returns a new object used to draw lines
// The object contains whether to draw a line between these two people and what the
// commonalities are.
function findCommonalities(peoplePairs) {

}

// Creates pairs of people for analysis
function createPairs(people) {
    if(people.length < 2) {
        return people;
    }

    // Since the positions and counts are fixed we can create a table of "possible pairs"
    var possibleConnections = [
       [1, 2, 3, 4],
       [0, 3, 5],
       [0, 3, 4],
       [0, 1, 4, 5],
       [0, 2, 3, 5],
       [1, 3, 4]
    ];

    var pairs = [];

    for(var i = 0; i < people.length; i++) {

        for(var connectionNumber of possibleConnections[i]) {
            if(people[connectionNumber] !== undefined) {
                pairs.append([people[i], people[connectionNumber]]);
            }
        }
    }

    return pairs;
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

function getPeopleSubset(subsetCount) {
    var usersRef = firebase.database().ref('users/');
    var nearestPeople = [];

    return usersRef.once('value').then(function(snapshot) {
      for(var key in devices) {
        if(devices[key].data.recordLocator && nearestPeople.length < subsetCount) {
          if(snapshot.hasChild(parseId(devices[key].data))) {
              var person = snapshot.child(parseId(devices[key].data));
              nearestPeople.push({
                  id: parseId(devices[key].data),
                  name: person.child('username').val(),
                  photo: person.child('picture').val()
              });
          }
        }
      }
      return nearestPeople;
    });
}

function getFriendData(friends){
    var usersRef = firebase.database().ref('users/');
    var friendData =[];

    return usersRef.once('value').then(function(users){
       for(var friend of friends){
           var friendObj = users.child(friend);
           friendData.push({name: friendObj.child('username').val(),
                            picture: friendObj.child('picture').val()});
       }
       return friendData;
    });

}

