var devices = null;
var selectedRowId = false;
var badge;

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
                highDeviceId = key;
            }
        }

        if(highDeviceId != "") {
            var badge = localStorage.currentDevice = parseId(devices[highDeviceId].data);

            var ref = firebase.database().ref('users/');
            ref.once('value').then(function(snapshot){
                if(snapshot.hasChild(badge) ) {
                    var user = snapshot.child(badge);


                    document.getElementById('device').style.display = 'none';


                    $("#returnVisit").html(
                        "<img id='userImage' src='" + user.child('picture').val() + "'>" +
                        "<div id='returnBanner'>" +
                        "<p>Welcome back to the VIP lounge " + user.child('username').val() + "!</p>" +
                        "<p>You've been here " + (user.child('visitCount').val() + 1) + " times.</p>" +
                        "</div>"
                    );
                    if(snapshot.child(badge).child('lastSeen').val() < (Date.now()-240000)){
                        firebase.database().ref('users/' + badge).update({lastSeen: Date.now(), visitCount: user.child('visitCount').val() + 1});
                    }
                } else if(highRssi > -70){
                    document.getElementById('far').style.display = 'none';
                    document.getElementById('near').style.display = 'block';
                } else {
                    document.getElementById('far').style.display = 'block';
                    document.getElementById('near').style.display = 'none';
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




////////////////////////////////////////////////////////////////////////////////////////
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


function processFriends(token, userId, data){
    var friends = firebase.database().ref('friends/');

    friends.once('value').then(function(snapshot){
        if(!snapshot.hasChild(userId)){
            return Promise.all(data.friends.data.map(function (friend) {
                return getBadgeId(friend.id).then(function (result) {
                    return Promise.all([
                        firebase.database().ref('friends/' + userId).push(result),
                        firebase.database().ref('friends/' + result).push(userId)]);
                });
            }));
        }
    }).then(function(){
        proximityLock = false;
        firebase.auth().signOut();
    });
}

function getBadgeId(facebookId){
    var val = firebase.database().ref('badges/').once('value').then(function(snapshot){
        if(snapshot.hasChild(facebookId)) {
            return snapshot.child(facebookId).child('badge').val();
        }
    });
    return val;
}


function createUser(token, data, badgeId){
    var likes = [], location = '', cover = '', hometown = '';
    if(data.likes){ likes = data.likes.data; }
    if(data.location){ location = data.location.name;}
    if(data.hometown){ hometown = data.hometown.name;}
    if(data.cover){ cover = data.cover.source.toString(); }

    firebase.database().ref('users/'+ badgeId).update({
        facebookId: data.id,
        username: data.name,
        age_range: data.age_range,
        likes: likes,
        location: location,
        hometown: hometown,
        picture: data.picture.data.url.toString(),
        cover: cover,
        visitCount: 0,
        barCount: 0,
        foodCount: 0,
        vrCount: 0,
        lastSeen: Date.now()
    });
    firebase.database().ref('badges/' + data.id).set({badge: badgeId});
    processFriends(token, badgeId, data);
}

function checkLoginState(token, deviceId) {
    if (token) {
        FB.api('/me', {access_token: token, fields: ['name', 'picture.type(large)', 'age_range', 'friends', 'likes', 'hometown', 'location', 'cover']}, function(data) {
            localStorage.setItem("user_id", data.id);
            createUser(token, data, deviceId);
        });
    } else {
        document.getElementById('status').innerHTML = 'Please log ' +
            'into Facebook.';
    }
}

function firebaseLogin(access_token, deviceId){
    var credential = firebase.auth.FacebookAuthProvider.credential(access_token);
    firebase.auth().signInWithCredential(credential).then(function(){
        checkLoginState(access_token, deviceId);
    });
}

(function(){
    var tokenRegex = new RegExp('#access_token' + "(=([^&#]*)|&|#|$)");
    var deviceIdRegex = new RegExp('deviceId' + "(=([^&#]*)|&|#|$)");
    var tokenResults = tokenRegex.exec(window.location.href);
    var deviceId = deviceIdRegex.exec(window.location.href);
    console.log(tokenResults);
    if(tokenResults && tokenResults[2] && deviceId) {
        firebaseLogin(tokenResults[2], deviceId[2]);
    }

    badge = getQueryStringValue('badge');
    console.log(badge);
    firebase.database().ref('users/'+badge).once('value').then(function(snapshot){
        if(snapshot.hasChild('picture')){
            var image = document.createElement(img);
            var parent = document.getElementsByName('body');
            image.id = 'userImage';
            image.src = snapshot.child('picture').val();
            parent.appendChild(image);
        }
    });
})();




