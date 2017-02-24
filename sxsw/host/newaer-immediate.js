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

var groups = [ 'Immediate','Near','Far', 'Unknown'];
$(document).ready(function() {
    console.log("document ready");
    $('#tester').html('<h2>itworked</h2>');
    checkIfRegistered();
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
            localStorage.set("currentDevice", highDeviceId);
        }
    }

    if(highDeviceId != "") {
        $('#deviceName').text(devices[highDeviceId].data.name);
        $('#locator').text(devices[highDeviceId].data.recordLocator)

        if(highDeviceId.substr(0,2) == "NA") { // Can only send message to NewAer devices
            $('.newAerButton').prop('disabled',false);
            selectedRowId = highDeviceId;
        } else {
            $('.newAerButton').prop('disabled',true);
        }
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
    ref.once('value').then(function(snapshot){
        if(!snapshot.hasChild('1671933982822109')){
            $("#device").html(` 
                <h1>Welcome to the Capital Factory VIP Lounge</h1>
                <h2>Please register your badge with your Facebook account</h2>
                <input type="button" class="newAerButton" id="messageButton1" onclick="login()" value="Register your badge with Facebook"/><br/>`);
        }
        else{
            let user = snapshot.child('1671933982822109');
            $("#device").html("<h2>Good to see you again " + user.child('username').val() + "</h2>" +
                "<img src='" + user.child('picture').val() + "'>" +
                "<h3>You've been here " + (user.child('visitCount').val()+1) + " times</h3>"
            );
            firebase.database().ref('users/id').update({visitCount: user.child('visitCount').val()+1});
        }
    });
}




function processFriends(userId, friendList){
    var friends = firebase.database().ref('friends/');


    friendList.forEach(function(friend){
        friends.child(userId).once('value').then(function(snapshot) {
            if(!snapshot.val()){
                friends.child(userId).push(friend.id);
                friends.child(friend.id).push(userId);
            }
            else{
                snapshot.forEach(function(id){
                    if(id.val() !== friend.id){
                        friends.child(userId).push(friend.id);
                        friends.child(friend.id).push(userId);
                    }
                });
            }
        });
    });
}


function createUser(data){
    var likes = [], location = '', cover = '';
    if(data.likes){ likes = data.likes.data; }
    if(data.location){ location = data.location.name;}
    if(data.cover){ cover = data.cover.source.toString(); }

    console.log(likes);

    firebase.database().ref('users/'+ data.id).update({
        facebookId: data.id,
        username: data.name,
        birthday: data.birthday,
        likes: likes,
        location: location,
        picture: data.picture.data.url.toString(),
        cover: cover,
        visitCount: 1,
        barCount: 0,
        foodCount: 0,
        vrCount: 0
    });
    firebase.database().ref('friendGraph/' + data.id).push({badge: 'tset'});
    processFriends(data.id, data.friends.data);
    //window.location = "/sxsw/host/drink_pref.html";
}

function checkLoginState(response) {
    if (response.status === 'connected') {
        FB.api('/me', {fields: ['name', 'picture.type(large)', 'birthday', 'friends', 'likes', 'hometown', 'location', 'cover']}, function(data) {
            console.log(data);
            localStorage.setItem("user_id", data.id);
            createUser(data);
            FB.logout();
        });
    } else {
        document.getElementById('status').innerHTML = 'Please log ' +
            'into Facebook.';
    }
}

function login() {
    FB.login(function(response){
        checkLoginState(response);
    }, {scope: 'user_birthday, user_friends, user_location'});

}
