import firebase from 'firebase';

var config = {
    apiKey: "AIzaSyCvDt__-j-koRzjvYOtlXmMjcjHrX9SPho",
    authDomain: "beaconbar-e8384.firebaseapp.com",
    databaseURL: "https://beaconbar-e8384.firebaseio.com",
    storageBucket: "beaconbar-e8384.appspot.com",
    messagingSenderId: "9892124037"
};
firebase.initializeApp(config);
firebase.auth().signInWithEmailAndPassword('thomas.rushton@originate.com', 'testpass');

var database = firebase.database();

export default database;
