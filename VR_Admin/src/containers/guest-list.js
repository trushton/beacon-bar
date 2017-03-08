import React, { Component } from 'react';
import _ from 'lodash';
import {connect} from 'nectarine';

import './Styles.css';

class GuestList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      profileList: [],
      queue: []
    };

    this.usersRef = this.props.getDatabase().ref('users');
    this.vrRef = this.props.getDatabase().ref('vrQueue');
  }


  updateQueue(queue) {
    this.usersRef.once('value', (users) => {
      var queueInfo = Object.keys(queue.val()).map((item) => {
        return {badge: item, profile: users.child(item).val(), waitTime: queue.child(item).val().timeEntered}
      });
      queueInfo = queueInfo.sort(function(a, b){
        return (a.waitTime.toString() > b.waitTime.toString()) ? 1 : -1;
      });

      this.setState({
        queue: queueInfo
      });
    });
  }

  componentDidMount = () => {
    this.vrRef.on('value', (queue) => {
      this.updateQueue(queue);
    });

    this.repeatedUpdate();
  }


  repeatedUpdate() {
    this.vrRef.once('value', (queue) => {
      console.log('updating now')
      this.updateQueue(queue);
    });

    setTimeout(() => {
      this.repeatedUpdate();
    }, 10000);
  }


  getTimeSince(time){
    var timeDiff = new Date(Date.now() - time);
    return timeDiff.getUTCHours() * 60 + timeDiff.getUTCMinutes() + " mins"; 
  }


  removeFromQueue(guest) {
    this.vrRef.child(guest.badge).remove();
  }


  completedExperience(guest) {
    var vrCount = 1;

    if(guest.profile.vrCount){
       vrCount = guest.profile.vrCount++;
    }

    this.usersRef.child(guest.badge).update({
      vrCount: vrCount
    });

    this.removeFromQueue(guest);
  }


  renderGuestThumbnail(guest) {
    return (
      <tr key={guest.badge}>
        <td>
          <img className="user-avatar" src={guest.profile.picture} alt="null"/>
        </td>
        <td>
          {guest.profile.username}
        </td>
        <td>
          {this.getTimeSince(guest.waitTime)}
        </td>
        <td>
          {this.state.queue.indexOf(guest)+1}
        </td>
        <td>
          <input id="remove" className='removeButton' type='button' onClick={() => this.removeFromQueue(guest)} value='Remove from Queue'/>
        </td>
        <td>
          <input id="completed" className='completedButton' type='button' onClick={() => this.completedExperience(guest)} value='Completed VR Experience'/>
        </td>
      </tr>
    );
  }


  render() {
    return (
      <div className='queue-list'>
        <table className="queue-data">
          <thead className="queue-header">
            <tr>
              <th></th>
              <th>Name</th>
              <th>Wait</th>
              <th className="position">Position</th>
            </tr >
          </thead>

          <tbody>
            {
              this.state.queue.map((guest) => {
                return this.renderGuestThumbnail(guest);
              })
            }
          </tbody>
        </table>
      </div>
    );
  }
}


const mapProps = (store) => {
  return {
    setSelectedGuest: store.sessionSlice.setSelectedGuest,
    getDatabase: store.sessionSlice.getDatabase
  }
}



export default connect({
  component: GuestList,
  mapProps
});
