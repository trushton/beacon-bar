function finishRegistration(value){
    firebase.database().ref('users/'+ localStorage.getItem('currentDevice')).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });
}

$(document).ready(function(){
    firebase.database().ref('users/'+localStorage.getItem('currentDevice')).once('value').then(function(){
       if(snapshot.hasChild('picture')){
           var image = document.createElement(img);
           var parent = document.getElementById('bod');
           image.id = 'userImage';
           image.src = snapshot.child('picture').val();
           parent.appendChild(image);
       }
    });
});
