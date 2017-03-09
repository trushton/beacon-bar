var datatable;
var devices = null;
var deviceArray = [];
var selectedRowId = false;
var updatePeriodInSeconds = 5;
var nearRangeRssi = -70;
var timeToEnterQueue = 30;
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

(function(){
    updateTimers();
})();



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


function updateTimers(){
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
                console.log(timeList);
                for(var person of timeList) {
                    guestData.push({
                        name: guests.child(person.badge).child('username').val(),
                        picture: guests.child(person.badge).child('picture').val(),
                        waitTime: getTimeSince(person.time),
                        position: timeList.map(function(e){return e.badge}).indexOf(person.badge) +1
                    });
                }
            }).then(function() {
                var upNext = guestData.slice(0,3);
                var upNextSource = $('#queued-guests-template').html();
                var upNextTemplate = Handlebars.compile(upNextSource);
                var upNextHtml = upNextTemplate({ guests: upNext });

                $('[data-queue-next-three]').html(upNextHtml);
            });
        }
    });


}


function getTimeSince(time) {
    var timeDiff = new Date(Date.now() - time);
    return timeDiff.getUTCHours() * 60 + timeDiff.getUTCMinutes() + " mins";
}


Handlebars.registerHelper("counter", function (index){
    return index + 1;
});
