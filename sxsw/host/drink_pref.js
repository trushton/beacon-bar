function finishRegistration(value){
    console.log(localStorage.getItem('currentDevice'));
    firebase.database().ref('users/'+ localStorage.getItem('currentDevice')).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });

}
