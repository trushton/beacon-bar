var badge;

function finishRegistration(value){
    firebase.database().ref('users/'+ badge).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });
}

$(document).ready(function(){
    badge = getQueryStringValue('badge');
    firebase.database().ref('users/'+badge).once('value').then(function(snapshot){
        if(snapshot.hasChild('picture')){
            var image = document.createElement(img);
            var parent = document.getElementById('bod');
            image.id = 'userImage';
            image.src = snapshot.child('picture').val();
            parent.appendChild(image);
        }
    });
});

function getQueryStringValue (key) {
    return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}