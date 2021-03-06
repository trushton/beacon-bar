var devices = null;
var selectedRowId = false;
var updatePeriodInSeconds = 3;
var nearRangeRssi = -80;
var timeToEnterQueue = 5;
var prevUpdate = 0;

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
            highDeviceId = key;
        }
    }

    if(highDeviceId != "") {
        localStorage.setItem("currentDevice", parseId(devices[highDeviceId].data));
    }

    if(prevUpdate + (updatePeriodInSeconds * 1000) < Date.now()){
        prevUpdate = Date.now();
        updateTimers();
        if(highRssi > nearRangeRssi){
            getSpotlightInfo();
        }
        else{
            $('[data-guest-spotlight]').html('');
            getSocialInfo();
        }
    }


}

function updateDevice(device) {

    var deviceDbRecord = firebase.database().ref('users/'+ parseId(device.data));
    var badge = parseId(device.data);

    devices[device.deviceId] = device;

    deviceDbRecord.once('value').then(function(currentRecord){
        firebase.database().ref('vrQueue/').once('value').then(function(vrQueue){
            if(!vrQueue.hasChild(badge) && currentRecord.child('username').val()) {
                if(device.rssi > nearRangeRssi ){
                    deviceDbRecord.update({ vrEnqueueTimer: (currentRecord.child('vrEnqueueTimer').val() + 1) });
                    if(currentRecord.child('vrEnqueueTimer').val() > timeToEnterQueue){
                        firebase.database().ref('vrQueue/' + badge).update({
                            timeEntered: Date.now()
                        });
                        deviceDbRecord.update({ vrEnqueueTimer: 0 });
                    }
                }
                else{
                    deviceDbRecord.update({ vrEnqueueTimer: 0 });
                }
            }
        });
    })
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

function updateTimers(){
    console.log('getting called now');
    var database = firebase.database();
    var guestData = [];

    database.ref('vrQueue').orderByChild('timeEntered').once('value').then(function(currentQueue){
        if(currentQueue){
            timeList = Object.keys(currentQueue.val()).map(function(guest){
                return {badge: guest, time: parseInt(currentQueue.child(guest).child('timeEntered').val())}
            });
            timeList = timeList.sort(function(a, b){
                    return (a.time.toString() > b.time.toString()) ? 1 : -1;
            });

            database.ref('users/').once('value').then(function(guests){
                for(var person of timeList) {
                    guestData.push({
                        name: guests.child(person.badge).child('username').val(),
                        picture: guests.child(person.badge).child('picture').val(),
                        location: guests.child(person.badge).child('location').val(),
                        waitTime: getTimeSince(person.time),
                        position: timeList.map(function(e){return e.badge}).indexOf(person.badge) +1
                    });
                }

                var upNext = guestData.slice(0,3);
                var upNextSource = $('#queued-guests-up-next').html();
                var upNextTemplate = Handlebars.compile(upNextSource);
                var upNextHtml = upNextTemplate({ guests: upNext });

                $('[data-queue-next-three]').html(upNextHtml);

                var remainingQueue = guestData.slice(3);
                var remainingSource = $('#remaining-queued-guests').html();
                var remainingTemplate = Handlebars.compile(remainingSource);
                var remainingHtml = remainingTemplate({ guests: remainingQueue });

                $('[data-queue]').html(remainingHtml);

            });
        }
    });
}


function getTimeSince(time) {
    var timeDiff = new Date(Date.now() - time);
    return timeDiff.getUTCHours() * 60 + timeDiff.getUTCMinutes() + " mins";
}


function leaveQueue(){
    var badge = localStorage.currentDevice;
    firebase.database().ref('vrQueue/').child(badge).remove();
    window.location.reload();
}


function getSpotlightInfo(){
    var badge = localStorage.currentDevice;
    var database = firebase.database();
    var users = database.ref('users/');
    var queue = database.ref('vrQueue/');

    var spotlight = {};

    users.child(badge).once('value').then(function(userData){
        spotlight['picture'] = userData.child('picture').val();
        queue.once('value').then(function(queueData){
            if(queueData){
                timeList = Object.keys(queueData.val()).map(function(guest){
                    return {badge: guest, time: parseInt(queueData.child(guest).child('timeEntered').val())}
                });
                timeList = timeList.sort(function(a, b){
                    return (a.time.toString() > b.time.toString()) ? 1 : -1;
                });

                spotlight['removeButton'] = true;

                var position = timeList.map(function(e){return e.badge}).indexOf(badge) +1;
                switch(position){
                    case 1:
                        spotlight['position'] = 'You are 1st in line!';
                        break;
                    case 2:
                        spotlight['position'] = 'You are 2nd in line!';
                        break;
                    case 3:
                        spotlight['position'] = 'You are 3rd in line!';
                        break;
                    case 0:
                        if(userData.child('username').val()){
                            spotlight['position'] = 'Stay here to be enqueued automatically!';
                        } else {
                            spotlight['position'] = 'Sorry, I don\'t recognize you, perhaps you need to register your badge?';
                        }
                        spotlight['removeButton'] = false;
                        break;
                    default:
                        spotlight['position'] = 'You are ' + position + 'th in line!';
                }
            } else {
                spotlight['position'] = 'You aren\'t in line yet, stick around to be enqueued automatically!';
            }

            var spotlightSource = $('#guest-spotlight').html();
            var spotlightTemplate = Handlebars.compile(spotlightSource);

            var spotlightHtml = spotlightTemplate({ spotlight: spotlight });

            $('[data-guest-spotlight]').html(spotlightHtml);
        });
    });
}

function getSocialInfo(){
    firebase.database().ref('users/').once('value').then(function(usersData){
        var completedGuests = [];
        usersData.forEach(function(user){
            if(user.child('vrCount').val() > 0){
                completedGuests.push(user.val());
            }
        });

        var guestToDisplay = randomize(completedGuests, 1);

        var socialSource = $('#guest-completed').html();
        var socialTemplate = Handlebars.compile(socialSource);

        console.log(guestToDisplay);
        var socialHtml = socialTemplate({
           guest: {picture: guestToDisplay[0]['picture'], name: guestToDisplay[0]['username']}
        });

        $('[data-guest-spotlight]').html(socialHtml);



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


Handlebars.registerHelper("counter", function (index){
    return index + 1;
});

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
    if(v1 < v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});