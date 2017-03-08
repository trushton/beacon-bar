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
    if((Date.now() - 3000) > guestRotationTime){
        for (var key in devices) {
            if(devices[key].rssi > highRssi) {
                highRssi = devices[key].rssi;
                highDeviceId = key;
            }
        }

        localStorage.setItem("currentDevice", parseId(devices[highDeviceId].data));
        displayGuest();
        guestRotationTime = Date.now();

        if(highDeviceId != "" && devices[highDeviceId].rssi > nearThreshold) {
            near = true;
         } else {
            near = false;
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
    var deviceDbRecord = firebase.database().ref('users/'+ parseId(device.data));
    devices[device.deviceId] = device;

    deviceDbRecord.once('value').then(function(currentRecord){
        if(currentRecord.child('username').val()){
            deviceDbRecord.update({
                barTime: (currentRecord.child('barTime').val() + 1)
            });
        }

        if(device.rssi > nearThreshold && currentRecord.child('lastSeenBar').val() < (Date.now() - (visitTimeSeperation * 1000))){
            deviceDbRecord.update({
                barCount: (currentRecord.child('barCount').val() + 1),
                lastSeenBar: Date.now()
            });
        }
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
            else { fillFarSocial(); }

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
        case 'like':
            return 'These people like ';
            break;
        case 'hometown':
            return 'These people come from the hometown of ';
            break;
        case 'drink_pref':
            return 'These people all enjoy ';
            break;
    }
}


function chooseFrom(type, data){
    var keys = Object.keys(data);
    var chosenKey = keys[keys.length * Math.random() <<0];

    return {
        header: getSocialHeader(type),
        name: chosenKey,
        people: data[chosenKey]
    };
}

function fillFarSocial(){
    var socialSource = $('#far-social-template').html();
    var socialTemplate = Handlebars.compile(socialSource);
    var socialHtml;

    var likesArray = [];
    var likesObj = {};
    firebase.database().ref('users/').once('value').then(function(users){
        users.forEach(function(user){
            if(user.val()['likes']){
                likesArray.push(user.val()['likes'].map(function(like){ return {name: like['name'], person: user.val()['picture']}}));
            }
        });

        likesArray = flatten(likesArray);
        likesArray.forEach(function(like){
            if(!likesObj[like.name]){
                likesObj[like.name] = [];
            }
            likesObj[like.name].push(like.person);
        });


        var sharedLikes = filterForSharedLike(likesObj);
        var displayedProperty = chooseFrom('like', sharedLikes);


        socialHtml = socialTemplate({
            header: displayedProperty['header'],
            name: displayedProperty['name'],
            people: displayedProperty['people'],
        });


        document.getElementById('menu').style.display = 'none';
        $('[data-near-social]').empty();
        $('[data-far-social]').html(socialHtml);
    });
}


function fillNearSocial(badgeId){
    var socialSource = $('#near-social-template').html();
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

            document.getElementById('menu').style.display = 'block';
            $('[data-far-social]').empty();
            $('[data-near-social]').html(socialHtml);
        });
    });
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


function recommendDrink(preference) {
    var keys = Object.keys(drinks[preference]);
    return drinks[preference][keys[keys.length * Math.random() << 0]];
}
