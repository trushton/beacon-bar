var datatable;
var devices = null;
var deviceArray = [];
var selectedRowId = false;
var guestRotationTime = 0;
var highDeviceId;
var nearThreshold = -70;
var near = false;
var visitTimeSeperation = 120;
var prevBadge;
var drinkRecommendation;

var drinks = {
    "vodka": {
        "Ladybird Lemonade": {
            "name": "Ladybird Lemonade",
            "ingredients": ["Vodka", "Lemonade", "Blue Curacao"]
        },
        "Moscow Mule": {
            "name": "Moscow Mule",
            "ingredients": ["Vodka", "Ginger beer", "Lime"]
        },
        "Texas Sipper": {
            "name": "Texas Sipper",
            "ingredients": ["Vodka", "Elderflower", "Grapefruit Juice", "Mint", "Topo Chico"]
        }
    },
    "whiskey": {
        "The Spark": {
            "name": "The Spark",
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
            "type": "Llano Estacado, TX"
        }
    },
    "white wine": {
        "Chenin Blanc": {
            "name": "Chenin Blanc",
            "type": "Llano Estacado"
        }
    }
};

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

function NAUpdate(devicesPresent) {
//    console.log("Update called with devicesPresent: "+devicesPresent);
    unescape(devicesPresent);

    console.log('calling it');
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


    if(highDeviceId != ""){
        localStorage.setItem("currentDevice", parseId(devices[highDeviceId].data));
        if(devices[highDeviceId].rssi > nearThreshold) {
            near = true;
        } else {
            near = false;
        }
    }

    if((Date.now() - 3000) > guestRotationTime){
        firebase.database().ref('users/').once('value').then(function(user){
            if(user.hasChild(localStorage.currentDevice) && user.child(localStorage.currentDevice).hasChild('username')){
                guestRotationTime = Date.now();
                displayGuest();
            }
        });
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

        if(currentRecord.child('username').val()){
            deviceDbRecord.update({
                //barTime: (currentRecord.child('barTime').val() + 1)

                barTime: Date.now() - currentRecord.child('barEntered').val()
            });

            if(device.rssi > nearThreshold && currentRecord.child('lastSeenBar').val() < (Date.now() - (visitTimeSeperation * 1000))){//((Date.now() - (visitTimeSeperation * 1000) - currentRecord.child('lastSeenBar').val()) > 0) ){
                deviceDbRecord.update({
                    barCount: (currentRecord.child('barCount').val() + 1),
                    lastSeenBar: Date.now()
                });
            }
        }


    });
}

function removeDevice(device)
{
//    console.log("Removing device: "+device.deviceId);

    if(device.data){
        var badge = parseId(device.data);
        firebase.database().ref('users/' + badge).once('value').then(function(user){
            if(badge && user.hasChild('username')){
                firebase.database().ref('users/'+badge).update({
                    barEntered: null
                })
            }
        });

    }

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

    if(device.data){
        var badge = parseId(device.data);
        firebase.database().ref('users/' + badge).once('value').then(function(userRef){
            if(badge && userRef.hasChild('username')){
                firebase.database().ref('users/' + badge).update({
                    barEntered: Date.now()
                })
            }
        });

    }

    devices[device.deviceId] = device;

}




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

            if(prevBadge !== badgeId){
                drinkRecommendation = recommendDrink(user.child('drink_pref').val());
                prevBadge = badgeId;
            }

            htmlz = guestTemplate({
                guestName: user.child('firstName').val(),
                guestImage: user.child('picture').val(),
                visitCount: user.child('barCount').val(),
                recommendedDrink: drinkRecommendation
            });

            if(near){ fillNearSocial(badgeId); }
            else {

                var funcs = randomize([0,1,2,3,4,5,6 ,7, 8],2);
                fillFarSocial(0, funcs[0]);
                fillFarSocial(1, funcs[1]);
                //fillFarSocial(2, funcs[2]);
            }

        }
        else {
            var source = $('#not-found-template').html();
            htmlz = Handlebars.compile(source);
        }

        $('[data-guest-highlight]').html(htmlz);

    });

}

function flatten(arr) {
    const flat = [].concat(...arr);
    return flat.some(Array.isArray) ? flatten(flat) : flat;
}


function filterForSharedLike(likes){
    for(var like in likes){
        likes[like] = Array.from(new Set(likes[like]));
        if(likes[like].length < 2) { delete likes[like]; }
    }
    return likes;
}


function getSocialHeader(type){
    switch(type){
        case 'location':
            return 'This person also lives in ';
            break;
        case 'matchingDrinks':
            return 'This person has also tried the ';
            break;
        case 'hometown':
            return 'This person comes from your hometown of ';
            break;
        case 'drink_pref':
            return 'This person also enjoys ';
            break;
        case 'generic':
            return 'This person has visited the VIP Lounge'
    }
}


function chooseFrom(data){
    if(data){
        var keys = Object.keys(data);
        return data[keys[keys.length * Math.random() <<0]];
    }

}


function getUserWasJustAt(){
    return firebase.database().ref('users/').once('value').then(function(guests){
        var guest = chooseFrom(guests.val());
        var places = [];
        if(guest['lastSeenBar'] > Date.now() - 30000){
            places.push('This person was just seen at the bar');
        }
        if(guest['generalAreaEntered'] !== null) {
            places.push('This person is in the lounge now');
        }
        if(guest['vrCount'] > 0){
            places.push('This person has completed the VR Experience');
        }

        places.push('This person was here ' + getTimeSince(guest['lastSeen']) + ' ago');


        return {fact: places[Math.floor(Math.random()*places.length-1)], person: guest};


    });
}


function runRandomSocial(func){

    switch(func){
        case 0:
            return getUserWasJustAt();//getUsersWithSharedFriend();
            break;
        case 1:
            return getUsersWithShared('hometown');
            break;
        case 2:
            return getUsersWithShared('hometown');
            break;
        case 3:
            return getUsersWithShared('location');
            break;
        case 4:
            return checkForFriends(localStorage.currentDevice).then(function(friendData){
                var data = {};
                var num = Math.floor(Math.random()*friendData.length);
                data['type'] = 'friend';

                data['person'] = friendData[0]['picture'];
                data['header'] = 'Your friend ' + friendData[num]['name'] + ' is here';
                data['name'] = friendData[num]['name'];
                return data;
            });
            break;
        case 5:
            return checkForFriends(localStorage.currentDevice).then(function(friendData){
                var data = {};
                var num = Math.floor(Math.random()*friendData.length);
                data['type'] = 'friend';

                data['person'] = friendData[0]['picture'];
                data['header'] = 'Your friend ' + friendData[num]['name'] + ' is here';
                data['name'] = friendData[num]['name'];
                return data;
            });
            break;
        case 6:
            return checkForFriends(localStorage.currentDevice).then(function(friendData){
                var data = {};
                var num = Math.floor(Math.random()*friendData.length);
                data['type'] = 'friend';

                data['person'] = friendData[0]['picture'];
                data['header'] = 'Your friend ' + friendData[num]['name'] + ' is here';
                data['name'] = friendData[num]['name'];
                return data;
            });
            break;
        case 7:
            return getUserWasJustAt();
            break;
        case 8:
            return getUsersWithShared('drink_pref');
            break;
    }
}


function fillFarSocial(index, func){
    var socialSource = $('#far-social-template').html();
    var socialTemplate = Handlebars.compile(socialSource);
    var socialHtml = null;

    runRandomSocial(func).then(function(data){
        if(data && data['fact']){
            socialHtml = socialTemplate({
                header: data['fact'],
                people: {name: data['person']['username'], picture: data['person']['picture']}
            });
        } else if(data){
            var user = chooseFrom(data['data']);
            var type, person, header;

            if(data['type'] === 'matchingDrinks' && data['data'][1]) {
                type = data['data'][1]['prevDrink'];
                person = {picture: data['data'][1]['person']['picture'], name: data['data'][1]['person']['username']};
                header = getSocialHeader('matchingDrinks');

                socialHtml = socialTemplate({
                    header: header,
                    name: type,
                    people: person
                });
            } else if( data['type'] === 'drink_pref' || data['type'] === 'location' || data['type'] === 'hometown' || data['type'] === 'prevDrink'){
                if(user && (user[data['type']] !== undefined && user[data['type']] !== '')) {
                    type = user[data['type']];
                    person = {picture: user['picture'], name: user['username']};
                    header = getSocialHeader(data['type']);

                    socialHtml = socialTemplate({
                        header: header,
                        name: type,
                        people: person
                    });
                }
            } else if (data['type'] === 'friend'){
                socialHtml = socialTemplate({
                    header: data['header'],
                    people: {picture: data['person'], name: data['name']}
                });
            }

        }

        if(socialHtml === null ||socialHtml['header'] === "" ){
            firebase.database().ref('users/').once('value').then(function(guests){
                var guest = chooseFrom(guests.val());
                socialHtml = socialTemplate({
                    header: getSocialHeader('generic'),
                    people: {picture: guest['picture'], name: guest['username']}
                });

                document.getElementById('menu').style.display = 'none';
                $('[data-near-social]').hide();
                $('[data-far-social' + index +']').show();
                $('[data-far-social' + index +']').html(socialHtml);
            });
        } else {
            document.getElementById('menu').style.display = 'none';
            $('[data-near-social]').hide();
            $('[data-far-social' + index +']').show();
            $('[data-far-social' + index +']').html(socialHtml);
        }


    });


    // var likesArray = [];
    // var likesObj = {};
    // firebase.database().ref('users/').once('value').then(function(users){
    //     users.forEach(function(user){
    //         if(user.val()['likes']){
    //             likesArray.push(user.val()['likes'].map(function(like){ return {id: like['id'], data: {likeName: like['name'], picture: user.val()['picture'], name: user.val()['username']}}}));
    //         }
    //     });
    //
    //     likesArray = flatten(likesArray);
    //     likesArray.forEach(function(like){
    //         if(!likesObj[like.id]){
    //             likesObj[like.id] = [];
    //         }
    //         likesObj[like.id].push(like.data);
    //     });


    //     var sharedLikes = filterForSharedLike(likesObj);
    //     var displayedProperty = chooseFrom('like', sharedLikes);
    //
    //     socialHtml = socialTemplate({
    //         header: displayedProperty['header'],
    //         name: displayedProperty['name'],
    //         people: displayedProperty['people'],
    //     });
    //
    //
    //     document.getElementById('menu').style.display = 'none';
    //     $('[data-near-social]').hide();
    //     $('[data-far-social]').show();
    //     $('[data-far-social]').html(socialHtml);
    //
    // })
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

function fillNearSocial(badgeId){
    var socialSource = $('#near-social-template').html();
    var socialTemplate = Handlebars.compile(socialSource);

    checkForFriends(badgeId).then(function(friendData){
        if(friendData.length  < 3) {
          var fillAmount = 3 - friendData.length;
          var remaining = [];
          firebase.database().ref('users/').once('value').then(function(users){
              users.forEach(function(user){
                 remaining.push(user.val());
              });

              friendData.concat(randomize(remaining, fillAmount));

              socialHtml = socialTemplate({
                friends: friendData
              });
              document.getElementById('menu').style.display = 'block';
              $('[data-far-social0]').hide();
              $('[data-far-social1]').hide();
             // $('[data-far-social2]').hide();
              $('[data-near-social]').show();
              $('[data-near-social]').html(socialHtml);
          });

        } else {
          socialHtml = socialTemplate({
            friends: friendData
          });
          document.getElementById('menu').style.display = 'block';
          $('[data-far-social0]').hide();
          $('[data-far-social1]').hide();
          //$('[data-far-social2]').hide();
          $('[data-near-social]').show();
          $('[data-near-social]').html(socialHtml);
        }
    });
}


function checkForFriends(badgeId) {
    var friendsAtBar = [];
    var friendData = [];
    return firebase.database().ref('friends/' + badgeId).once('value').then(function (friends) {
        return firebase.database().ref('users').once('value').then(function (barGuests) {
            friends.forEach(function (friend) {
                if (barGuests.hasChild(friend.val()) && barGuests.child(friend.val()).val()['barEntered']) {
                    friendsAtBar.push(friend.val());
                }
            });

            for (var friend of friendsAtBar) {
                var friendObj = barGuests.child(friend);
                friendData.push({
                    name: friendObj.child('firstName').val(),
                    picture: friendObj.child('picture').val()
                });
            }
            return friendData;
        });
    });
}

function recommendDrink(preference) {
    var keys = Object.keys(drinks[preference]);
    return drinks[preference][keys[keys.length * Math.random() << 0]];
}

function getUsersWithSharedDrinkHistory(){
    var matchingDrinks = [];
    var users = firebase.database().ref('users/');

    return users.once('value').then(function(registeredUsers){
        var userDrinks = registeredUsers.child(localStorage.currentDevice).val()['drinks'];
        var keys = Object.keys(userDrinks);
        var drinkData = [];
        for(var drink in userDrinks){
            drinkData.push(userDrinks[drink]['name']);
        }

        for(var user in registeredUsers.val()){
            if(registeredUsers.val()[user]['drinks'] && user !== localStorage.currentDevice){
                var otherDrinkData = [];
                for(var drink in registeredUsers.val()[user]['drinks']){
                    otherDrinkData.push(registeredUsers.val()[user]['drinks'][drink]['name']);
                }

                matchingDrinks = otherDrinkData.map(function(drink){
                    if(drinkData.includes(drink)){
                        return {prevDrink: drink, person: registeredUsers.child(user).val()};
                    }
                });
            }
        }

        return {type: 'matchingDrinks', data: matchingDrinks};
    });
}


function getUsersWithSharedFriend(){
    var matchingFriends = [];
    var friendsRef = firebase.database().ref('friends/');

    return friendsRef.once('value').then(function(friendsLists) {
        return firebase.database().ref('users/').once('value').then(function(users){
            var userFriends = friendsLists.child(localStorage.currentDevice).val();
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

                return {type: 'mutualFriends', data: Array.from(new Set(matchingFriends))};
            });
        });

    });
}

function getUsersWithShared(property){
    var peopleWithProperty = [];
    var users = firebase.database().ref('users/');

    return users.once('value').then(function(registeredUsers){
        var userVal = registeredUsers.child(localStorage.currentDevice).child(property).val();

        for(var user in registeredUsers.val()){
            if(registeredUsers.val()[user][property] === userVal && user !== localStorage.currentDevice){
                peopleWithProperty.push( registeredUsers.val()[user] );
            }
        }

        return {type: property, data: peopleWithProperty};
    });
}


function getTimeSince(time) {
    var timeDiff = new Date(Date.now() - time);
    return timeDiff.getUTCHours() * 60 + timeDiff.getUTCMinutes() + " mins";
}



Handlebars.registerHelper('ifCond', function(v1, v2, options) {
    if(v1 < v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});