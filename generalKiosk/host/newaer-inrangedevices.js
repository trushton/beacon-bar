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

          $('#social-graph').html(sourceTemplate(context));
        } else {

          var peoplePairs = createPairs(userSubset);

          var context = {
            people: userSubset,
            commonalities: findCommonalities(peoplePairs)
          };

          $('#social-graph').html(sourceTemplate(context));
        }
    });
}

// Searches likes, etc and returns a new object used to draw lines
// The object contains whether to draw a line between these two people and what the
// commonalities are.
function findCommonalities(peoplePairs) {
  commonalities = [];

  for(var peoplePair of peoplePairs) {
    drinkPref = null;
    hometown = null;

    var similarLikes = [];

    var person1Likes = peoplePair[0].likes;
    var person2Likes = peoplePair[1].likes;

    if(person1Likes !== null && person2Likes !== null) {
      for (var i = 0; i < person1Likes.length; i++) {
        for (var j = 0; j < person2Likes.length; j++) {
          if (person1Likes[i].id === person2Likes[j].id) {
            similarLikes.push(person1Likes[i]);
          }
        }
      }
    }

    if(peoplePair[0].drinkPref === peoplePair[1].drinkPref) {
      drinkPref = peoplePair[0].drinkPref;
    }

    if(peoplePair[0].hometown === peoplePair[1].hometown) {
      hometown = peoplePair[0].hometown;
    }

    var lineClass = null;

    if(similarLikes.length > 0 || drinkPref !== null || hometown !== null) {
      lineClass = "connector";
    } else {
      lineClass = "connector-hidden";
    }

    var principleLike = null;

    if(similarLikes.length > 0) {
      principleLike = "Facebook like";
    } else if(hometown) {
      principleLike = hometown;
    } else if(drinkPref) {
      principleLike = drinkPref;
    }

    var data = {
      person1: peoplePair[2],
      person2: peoplePair[3],
      similarLikes: similarLikes,
      similarDrinkPreference: drinkPref,
      similarHometown: hometown,
      principleLike: principleLike,
      lineClass: lineClass
    };

    commonalities.push(data);
  }
  return commonalities;
}

// Creates pairs of people for analysis
function createPairs(people) {
    if(people.length < 2) {
        return people;
    }

    // Since the positions and counts are fixed we can create a table of "possible pairs"
    // These are the unique combinations.
    var possibleConnections = [
       [1, 2, 3, 4],
       [3, 5],
       [4],
       [4, 5],
       [5]
    ];

    var pairs = [];

    // We can do this because the index of the actual person is encoded as the index
    // in the possibleConnections array.
    for(var i = 0; i < possibleConnections.length; i++) {
        for(var connectionNumber of possibleConnections[i]) {
            if(people[connectionNumber] !== undefined) {
                pairs.push([people[i], people[connectionNumber], i, connectionNumber]);
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
                  photo: person.child('picture').val(),
                  likes: person.child('likes').val(),
                  drinkPref: person.child('drink_pref').val(),
                  hometown: person.child('hometown').val()
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

