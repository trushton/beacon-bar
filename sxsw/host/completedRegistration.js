function displayData(){
    var ref = firebase.database().ref('users/'+localStorage.getItem("currentDevice"));
    ref.once('value').then(function(snapshot){
        $('.user').text("Thank you " + snapshot.child('username').val()
        + " for registering for the lounge. Redirecting shortly");
    });


}

$(document).ready(function(){
    displayData();
});
