function finishRegistration(value){
    firebase.database().ref('users/'+ localStorage.getItem("currentDevice")).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });

}
