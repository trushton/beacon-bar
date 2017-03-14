var datatable;
var devices = null;
var deviceArray = [];
var selectedRowId = false;
var guestRotationTime = 10;
var previousRotation = 0;
var highDeviceId;
var nearThreshold = -50;
var visitTimeSeperation = 120;
var near = false;

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


function parse_query_string(string) {
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

function NAUpdate(devicesPresent) {
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
            localStorage.setItem("currentDevice", parseId(devices[highDeviceId].data));
        }
    }

    if(highDeviceId != ""){
        if(devices[highDeviceId].rssi > nearThreshold) {
            near = true;
        } else {
            near = false;
        }
    }

    if((Date.now() - 3000 > guestRotationTime)){
        guestRotationTime = Date.now();

        if(near){
            displayWeb();
        } else{
            displayGraph();
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


function updateDevice(device) {
    var deviceDbRecord = firebase.database().ref('users/'+ parseId(device.data));
    devices[device.deviceId] = device;

    deviceDbRecord.once('value').then(function(currentRecord){

        if(device.rssi > nearThreshold && currentRecord.child('lastSeenGeneral').val() < (Date.now() - (visitTimeSeperation * 1000))){//((Date.now() - (visitTimeSeperation * 1000) - currentRecord.child('lastSeenBar').val()) > 0) ){
            deviceDbRecord.update({
                generalCount: (currentRecord.child('generalCount').val() + 1),
                lastSeenBar: Date.now()
            });
        }
    });
}


function removeDevice(device) {
//    console.log("Removing device: "+device.deviceId);
    if(device.data){
        var badge = parseId(device.data);
        firebase.database().ref('users/' + badge).once('value').then(function(user){
            if(badge && user.hasChild('username')){
                firebase.database().ref('users/'+badge).update({
                    generalAreaEntered: null
                })
            }
        });

    }
    delete devices[device.deviceId];
}


function addDevice(device) {
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

    if(device.data){
        var badge = parseId(device.data);
        firebase.database().ref('users/' + badge).once('value').then(function(userRef){
            if(badge && userRef.hasChild('username')){
                firebase.database().ref('users/' + badge).update({
                    generalAreaEntered: Date.now()
                });
            }
        });

    }

    devices[device.deviceId] = device;

}

function displayGraph() {
    var socialGraphSource = $('#social-graph-template').html();
    var sourceTemplate = Handlebars.compile(socialGraphSource);

    $('#social-web').html('');
    getPeopleSubset(6).then(function(userSubset){
        if(userSubset.length < 2) {
          var context = {
            people: userSubset
          };

          $('#social-web').html('');
          $('#social-graph').html(sourceTemplate(context));
        } else {

          var peoplePairs = createPairs(userSubset);

          var context = {
            people: userSubset,
            commonalities: findAllCommonalities(peoplePairs)
          };

          $('#social-web').html('');
          $('#social-graph').html(sourceTemplate(context));
        }
    });
}

function displayWeb() {
  // People are ordered from the inside out.
  // Middle person is index 0, top person is index 1, and proceeds to index n
  // clockwise.
  var socialWebSource = $('#social-web-template').html();
  var sourceTemplate = Handlebars.compile(socialWebSource);

  $('#social-graph').html('');
  getPeopleWeb().then(function(people) {
    firebase.database().ref('users/'+localStorage.currentDevice).once('value').then(function(closestPerson){
        var nearestPerson = people[0];
        var remainingPeople = [];


        for(var person of people) {
            if(person.name === closestPerson.child('username').val()){
                nearestPerson = person;
            } else if (person.name !== nearestPerson.name) {
                remainingPeople.push(person);
            }
        }

        var peoplePairs = [];

        for(var i = 0; i < remainingPeople.length; i++) {
            peoplePairs.push([nearestPerson, remainingPeople[i], 0, i + 1]);
        }

        var context = {
            people: people,
            commonalities: findAllCommonalities(peoplePairs)
        };

        $('#social-web').html(sourceTemplate(context));
    });
  });
}


function randomize(array, n) {
    var final = [];
    array = array.filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    }).sort(function() { return 0.5 - Math.random() });

    var len = array.length,
        n = n > len ? len : n;

    for(var i = 0; i < n; i ++)
    {
        final[i] = array[i];
    }

    return final;
}


function getPeopleWeb() {
  var usersRef = firebase.database().ref('users/');
  var nearestPeople = [];
  var areaGuests = [];

  return usersRef.once('value').then(function(users){
      users.forEach(function(user){
          if((user.val()['generalAreaEntered'] || (user.val()['lastSeen'] > (Date.now() - 1200000))) && user.child('username').val() !== users.child(localStorage.currentDevice).child('username').val()){
              areaGuests.push(user.val());
          }

      });

      nearestPeople.push({
          name: users.child(localStorage.currentDevice).child('username').val(),
          photo: users.child(localStorage.currentDevice).child('picture').val(),
          drinkPref: users.child(localStorage.currentDevice).child('drink_pref').val(),
          hometown: users.child(localStorage.currentDevice).child('hometown').val(),
          location: users.child(localStorage.currentDevice).child('location').val()
      });


      areaGuests = randomize(areaGuests, 8);

      console.log(areaGuests);

      for(var i = 0; i < 8; i++){
          nearestPeople.push({
              name: areaGuests[i]['username'],
              photo: areaGuests[i]['picture'],
              drinkPref: areaGuests[i]['drink_pref'],
              hometown: areaGuests[i]['hometown'],
              location: areaGuests[i]['location']
          })
      }


    if (nearestPeople.length === 0) {
      return
    }

    if (nearestPeople.length < 9) {
      // Pad nearestPeople with people who are on-site (most recent updates)
    }

    var nearestPerson = nearestPeople[0];

    var remainingPeople = [];

    for(var person of nearestPeople) {
      if(person.name !== nearestPerson.name) {
         remainingPeople.push(person);
      }
    }

    return [nearestPerson].concat(remainingPeople);
  });
}

function findCommonalities(peoplePair) {
  drinkPref = null;
  hometown = null;
  var location = null;
  var barCount = null;
  var vrCount = null;


  if(peoplePair[0].drinkPref === peoplePair[1].drinkPref && peoplePair[0].drinkPref !== "") {
    drinkPref = peoplePair[0].drinkPref;
  }

  if(peoplePair[0].hometown === peoplePair[1].hometown && peoplePair[0].hometown !== "") {
    hometown = peoplePair[0].hometown;
  }

  if(peoplePair[0].location === peoplePair[1].location && peoplePair[0].location !== "") {
    location = peoplePair[0].location;
  }


  if(peoplePair[0].barCount === peoplePair[1].barCount && peoplePair[0].barCount !== 0 && peoplePair[0].barCount !== null && peoplePair[0].barCount !== undefined) {
    barCount = "bar visits: " + peoplePair[0].barCount;
  }

  if(peoplePair[0].vrCount === peoplePair[1].vrCount && peoplePair[0].vrCount !== 0 && peoplePair[0].vrCount !== null) {
    vrCount = "VR completed";
  }

  var lineClass = null;

  if(/*similarLikes.length > 0 ||*/(vrCount != null) || (barCount !== null && barCount !== undefined) || (drinkPref !== null && drinkPref !== undefined) || (hometown !== null && hometown !== undefined) || (location !== null && location !== undefined)) {
    lineClass = "connector";
  } else {
    lineClass = "connector-hidden";
  }

  var principleLike = null;

  // if(similarLikes.length > 0) {
  //   principleLike = "Facebook like";
  // } else

  if(location) {
      principleLike = location;
  } else if(barCount){
      principleLike = barCount;
  }  else if(hometown) {
      principleLike = hometown;
  } else if(drinkPref) {
      principleLike = drinkPref;
  } else if(vrCount) {
      principleLike = vrCount;
  }

  return {
    person1: peoplePair[2],
    person2: peoplePair[3],
    //similarLikes: similarLikes,
    similarDrinkPreference: drinkPref,
    similarHometown: hometown,
    similarLocation: location,
    similarBarCount: barCount,
    similarVrCount: vrCount,
    principleLike: principleLike,
    lineClass: lineClass
  };
}

// Searches likes, etc and returns a new object used to draw lines
// The object contains whether to draw a line between these two people and what the
// commonalities are.
function findAllCommonalities(peoplePairs) {
  commonalities = [];

  for(var peoplePair of peoplePairs) {
    commonalities.push(findCommonalities(peoplePair));
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
    var peopleData = [];

    return usersRef.once('value').then(function(users){

        users.forEach(function(user){
            nearestPeople.push(user.val());
        });

        nearestPeople = randomize(nearestPeople, subsetCount);
        nearestPeople.map(function(person){
           peopleData.push({
               name: person['username'],
               photo: person['picture'],
               drinkPref: person['drink_pref'],
               hometown: person['hometown'],
               location: person['location'],
               barCount: person['barCount'],
               vrCounts: person['vrCount']
           })
        });

        return peopleData;
    });
}


function chooseRandomElement(data){
    var keys = Object.keys(data);
    return data[keys[keys.length * Math.random() << 0]];
}


function flatten(arr) {
    const flat = [].concat(...arr);
    return flat.some(Array.isArray) ? flatten(flat) : flat;
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

function getUsersWithSharedDrinkHistory(){
    var matchingDrinks = [];
    var users = firebase.database().ref('users/');

    return users.once('value').then(function(registeredUsers){
        var userDrinks = registeredUsers.child(badge).val()['drinks'];
        var keys = Object.keys(userDrinks);
        var drinkData = [];
        for(var drink in userDrinks){
            drinkData.push(userDrinks[drink]['name']);
        }

        for(var user in registeredUsers.val()){
            if(registeredUsers.val()[user]['drinks'] && user !== badge){
                var otherDrinkData = [];
                for(var drink in registeredUsers.val()[user]['drinks']){
                    otherDrinkData.push(registeredUsers.val()[user]['drinks'][drink]['name']);
                }

                matchingDrinks = otherDrinkData.map(function(drink){
                    if(drinkData.includes(drink)){
                        return {drink: drink, person: registeredUsers.child(user).val()};
                    }
                });
            }
        }

        return matchingDrinks;
    });
}


function getUsersWithSharedFriend(){
    var matchingFriends = [];
    var friendsRef = firebase.database().ref('friends/');

    return friendsRef.once('value').then(function(friendsLists) {
        return firebase.database().ref('users/').once('value').then(function(users){
            var userFriends = friendsLists.child(badge).val();
            var keys = Object.keys(userFriends);
            var friendBadges = [];

            keys.map(function(friend){
                friendBadges.push(userFriends[friend]);
            });

            console.log(friendBadges);
//
            friendBadges.map(function(friend){
                var facebookId = users.child(friend).child('facebookId').val();
                var others = [];

                var otherFriends = friendsLists.child(friend).val();
                var otherKeys = Object.keys(otherFriends);
                otherKeys.map(function(person){
                    others.push(otherFriends[person]);
                });

                matchingFriends = others.map(function(mutualFriend){
                    if(friendBadges.includes(mutualFriend)){
                        return {friend: users.child(friend).val(), mutualFriend: users.child(mutualFriend).val()};
                    }
                });

                return Array.from(new Set(matchingFriends));
            });
        });

    });
}