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

$(document).ready(function(){
    checkIfRegistered();
});


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