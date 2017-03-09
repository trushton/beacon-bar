import React, { Component } from 'react';
import {connect} from 'nectarine';

import GuestList from './containers/guest-list';
import './VR_admin.css';

class VrAdmin extends Component {

  render() {
    return (
      <div>
        <p id="bartender-title">
          VR Admin
        </p>
        <GuestList/>
      </div>
    );
  }
}

const mapProps = (store) => {
  return {
    getSelectedGuest: store.sessionSlice.selectedGuest.$get
  }
}

export default connect({
  component: VrAdmin,
  mapProps
});

