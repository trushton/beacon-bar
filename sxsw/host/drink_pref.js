function finishRegistration(value){
    firebase.database().ref('users/'+ localStorage.getItem("currentDevice")).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });

}

//$(document).ready(function () {
//    firebase.database().ref('users/').once('value', function(snapshot){
//        if(snapshot.hasChild(badge)){
//
//        }
//    });
//});
