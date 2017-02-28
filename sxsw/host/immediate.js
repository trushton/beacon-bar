
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
            $("#device").html("<h1>Welcome to the Capital Factory VIP Lounge</h1>" +
                "<h2>Please register your badge with your Facebook account</h2>" +
                '<button onclick="login()">Register your badge with Facebook</button>');

        }
        else{
            var user = snapshot.child('1671933982822109');
            $("#device").html("<h2>Good to see you again " + user.child('username').val() + "</h2>" +
                "<img src='" + user.child('picture').val() + "'>" +
                "<h3>You've been here " + (user.child('visitCount').val()+1) + " times</h3>"
            );
            firebase.database().ref('users/1671933982822109').update({visitCount: user.child('visitCount').val()+1});
        }
    });
}



function processFriends(token, userId, friendList){
    var friends = firebase.database().ref('friends/');

    friendList.forEach(function(friend){
        friends.child(userId).once('value').then(function(snapshot) {
            var friendBadge = getBadgeId(friend.id);
            if(!snapshot.val()){
                friends.child(userId).push(friendBadge);
                friends.child(friendBadge).push(userId);
            }
            else{
                snapshot.forEach(function(id){
                    if(getBadgeId(id.val()) !== friendBadge){
                        friends.child(userId).push(friendBadge);
                        friends.child(friendBadge).push(userId);
                    }
                });
            }
        });
    });

    window.location = 'https://www.facebook.com/logout.php?next=https://beacon-bar-file-server.herokuapp.com/sxsw/host/drink_pref.html&access_token=' + token;
}

function getBadgeId(facebookId){
    firebase.database().ref('badges/').once('value').then(function(snapshot){
       return snapshot.child(facebookId).child('badge').val();
    });
}


function createUser(token, data){
    var likes = [], location = '', cover = '';
    if(data.likes){ likes = data.likes.data; }
    if(data.location){ location = data.location.name;}
    if(data.cover){ cover = data.cover.source.toString(); }

    var badgeId = localStorage.getItem("currentDevice");
    firebase.database().ref('users/'+ badgeId).set({
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
    firebase.database().ref('badges/' + badgeId).push({badge: badgeId, test: 'did it work'});
    processFriends(token, badgeId, data.friends.data);

}

function checkLoginState(token) {
    if (token) {

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

$(document).ready(function(){
    checkIfRegistered();
    var regex = new RegExp('#access_token' + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(window.location.href);
    console.log(results);
    if(results && results[2]) {
        firebaseLogin(results[2]);
    }
});
