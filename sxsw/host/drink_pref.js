var badge;

function finishRegistration(value){
    firebase.database().ref('users/'+ badge).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });
}

$(document).ready(function(){
    badge = localStorage.currentDevice;
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
