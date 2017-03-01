var devices = null;
var selectedRowId = false;


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
        $('#deviceName').text(devices[highDeviceId].data.name);

        localStorage.setItem("currentDevice", '1:69');


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



window.fbAsyncInit = function() {
    FB.init({
        appId      : '988112061288748',
        cookie     : true,  // enable cookies to allow the server to access
                            // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.8' // use graph api version 2.8
    });

};

// Load the SDK asynchronously
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));


function checkIfRegistered(){
    var ref = firebase.database().ref('users/');
    var userBadge = localStorage.getItem("currentDevice");
    if(userBadge === null){userBadge = '';}

    ref.once('value').then(function(snapshot){
        if(!snapshot.hasChild('userBadge')){
            $("#device").html("<div id='immediateBanner'><p>Got a VIP beacon badge?<br>Unlock the magic!</p></div>" +
                '<button onclick="login()">Register your badge with Facebook</button>'+
                '<div id="dataProtection">Don\'t worry, we won\'t save any of your data.</div>');
        }
        else{
            var user = snapshot.child(userBadge);
            $("#device").html("<h2>Good to see you again " + user.child('username').val() + "</h2>" +
                "<img src='" + user.child('picture').val() + "'>" +
                "<h3>You've been here " + (user.child('visitCount').val()+1) + " times</h3>"
            );
            firebase.database().ref('users/' + userBadge).update({visitCount: user.child('visitCount').val()+1});
        }
    });
}



function processFriends(token, userId, friendList){
    var friends = firebase.database().ref('friends/');

    friendList.forEach(function(friend){
        //friends.child(userId).once('value').then(function(snapshot) {
        // var friendBadge = getBadgeId(friend.id);
        // if(!snapshot.val()){
        //     friends.child(userId).push(friendBadge);
        //     friends.child(friendBadge).push(userId);
        // }
        // else{
        //     snapshot.forEach(function(id){
        //         if(getBadgeId(id.val()) !== friendBadge){
        //             friends.child(userId).push(friendBadge);
        //             friends.child(friendBadge).push(userId);
        //         }
        //     });
        // }
        //});
    });

}

function getBadgeId(facebookId){
    firebase.database().ref('badges/'+facebookId).once('value').then(function(snapshot){
        if(snapshot.child('badge')){
            return snapshot.child('badge').val();
        }
    });
}


function createUser(token, data){
    var likes = [], location = '', cover = '';
    if(data.likes){ likes = data.likes.data; }
    if(data.location){ location = data.location.name;}
    if(data.cover){ cover = data.cover.source.toString(); }

    var badgeId = localStorage.getItem("currentDevice");
    if(badgeId === null || badgeId === undefined){badgeId = '';}
    firebase.database().ref('users/'+ badgeId).set({
        facebookId: data.id,
        username: data.name,
        //birthday: data.birthday,
        likes: likes,
        location: location,
        picture: data.picture.data.url.toString(),
        cover: cover,
        visitCount: 1,
        barCount: 0,
        foodCount: 0,
        vrCount: 0,
        lastSeen: Date.now()
    });
    firebase.database().ref('badges/' + badgeId).push({badge: badgeId, test: 'did it work'});
    // processFriends(token, badgeId, data.friends.data).then(function(){
    //     if(calculateAge(data.birthday) > 20){
    window.location = 'https://www.facebook.com/logout.php?next=https://beacon-bar-file-server.herokuapp.com/sxsw/host/drink_pref.html&access_token=' + token;
    //     } else {
    //         window.location = 'https://www.facebook.com/logout.php?next=https://beacon-bar-file-server.herokuapp.com/sxsw/host/completedRegistration.html&access_token=' + token;
    //     }
    // });

}

function calculateAge(birthday){
    var ageDifMs = Date.now() - new Date(birthday);
    var ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function checkLoginState(token) {
    if (token) {
        $('#locator').text(highDeviceId);

        FB.api('/me', {access_token: token, fields: ['name', 'picture.type(large)', 'birthday', 'friends', 'likes', 'hometown', 'location', 'cover']}, function(data) {
            localStorage.setItem("user_id", data.id);
            createUser(token, data);
        });
    } else {
        document.getElementById('status').innerHTML = 'Please log ' +
            'into Facebook.';
    }
}

function login() {
    window.location = "https://www.facebook.com/v2.8/dialog/oauth?client_id=988112061288748&scope=user_birthday,user_likes,user_friends&response_type=token&redirect_uri=http://beacon-bar-file-server.herokuapp.com/sxsw/host/immediatedevice.html";
}


function firebaseLogin(access_token){
    var credential = firebase.auth.FacebookAuthProvider.credential(access_token);
    firebase.auth().signInWithCredential(credential).then(function(){
        checkLoginState(access_token);
    });
}

checkIfRegistered();
var regex = new RegExp('#access_token' + "(=([^&#]*)|&|#|$)");
var results = regex.exec(window.location.href);
console.log(results);
if(results && results[2]) {
    firebaseLogin(results[2]);
}
