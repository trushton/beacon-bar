import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'nectarine';

import store from './store';
import VrAdmin from './VR_admin';
import './index.css';
import database from './helpers/database';

store.sessionSlice.database.$set(database);

ReactDOM.render(
  <Provider store={store} className="main">
    <div className="main">
      <VrAdmin />
    </div>
  </Provider>,
  document.getElementById('root')
);
