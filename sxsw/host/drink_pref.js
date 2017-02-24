function finishRegistration(value){
    console.log(localStorage.getItem('user_id'));
    firebase.database().ref('users/'+ localStorage.getItem('user_id')).update({
        drink_pref: value.toString()
    }).then(function(){
        window.location = "/sxsw/host/completedRegistration.html";
    });

}
